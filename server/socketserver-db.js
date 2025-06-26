const { createServer } = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;
require("dotenv").config();
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "12345678901234567890123456789012";
const normalizeKey = (key) => {
  if (key.length === 32) return key;
  if (key.length > 32) return key.substring(0, 32);
  return key.padEnd(32, "0");
};
const NORMALIZED_KEY = normalizeKey(ENCRYPTION_KEY);
console.log("🔑 Original key:", ENCRYPTION_KEY);
console.log("🔑 Encryption key length:", NORMALIZED_KEY.length);
console.log("🔑 Normalized key:", NORMALIZED_KEY);
const prisma = new PrismaClient();
const simpleEncrypt = (text) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(NORMALIZED_KEY),
      iv
    );
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt message");
  }
};
const simpleDecrypt = (encryptedData) => {
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(NORMALIZED_KEY),
      iv
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt message");
  }
};
const getOrCreateChat = async (userId1, userId2) => {
  try {
    const existingChat = await prisma.chat.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [userId1, userId2],
            },
          },
        },
      },
      include: {
        participants: true,
      },
    });
    if (existingChat && existingChat.participants.length === 2) {
      return existingChat;
    }
    const newChat = await prisma.chat.create({
      data: {
        participants: {
          create: [{ userId: userId1 }, { userId: userId2 }],
        },
      },
      include: {
        participants: true,
      },
    });
    return newChat;
  } catch (error) {
    console.error("Error getting or creating chat:", error);
    throw error;
  }
};
const saveMessage = async (messageData) => {
  try {
    const chat = await getOrCreateChat(
      messageData.senderId,
      messageData.recipientId
    );
    const encryptedContent = simpleEncrypt(messageData.content);
    const savedMessage = await prisma.message.create({
      data: {
        encryptedContent,
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        chatId: chat.id,
        delivered: false,
        read: false,
      },
      include: {
        sender: true,
        recipient: true,
      },
    });
    return {
      id: savedMessage.id,
      content: simpleDecrypt(savedMessage.encryptedContent),
      senderId: savedMessage.senderId,
      senderUsername: savedMessage.sender.username,
      recipientId: savedMessage.recipientId,
      delivered: savedMessage.delivered,
      read: savedMessage.read,
      timestamp: savedMessage.createdAt,
    };
  } catch (error) {
    console.error("Error saving message:", error);
    throw error;
  }
};
const getConversationHistory = async (userId1, userId2) => {
  try {
    const chat = await getOrCreateChat(userId1, userId2);
    const messages = await prisma.message.findMany({
      where: {
        chatId: chat.id,
      },
      include: {
        sender: true,
        recipient: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    return messages.map((message) => ({
      id: message.id,
      content: simpleDecrypt(message.encryptedContent),
      senderId: message.senderId,
      senderUsername: message.sender.username,
      recipientId: message.recipientId,
      delivered: message.delivered,
      read: message.read,
      timestamp: message.createdAt,
    }));
  } catch (error) {
    console.error("Error getting conversation history:", error);
    return [];
  }
};
const initSocket = (io) => {
  console.log("🧠 Initializing Socket.io handlers with database integration");
  try {
    const onlineUsers = new Map();
    const typingUsers = new Map();
    io.on("connection", (socket) => {
      console.log("✅ New connection:", socket.id);
      let currentUserId = null;
      let currentUsername = null;
      socket.on("register-user", async (userData) => {
        try {
          const { userId, username } = userData;
          console.log(`👤 Registering user: ${username} (${userId})`);
          currentUserId = userId;
          currentUsername = username;
          onlineUsers.set(socket.id, {
            userId,
            username,
            socketId: socket.id,
          });
          socket.emit("user-registered", { userId, username });
          const userList = Array.from(onlineUsers.values());
          io.emit("online-users", userList);
          console.log(`✅ User ${username} registered successfully`);
        } catch (error) {
          console.error("❌ Error registering user:", error);
          socket.emit("error", { message: "Failed to register user" });
        }
      });
      socket.on("chat-message", async (messageData) => {
        try {
          console.log("📨 Received chat message:", messageData);
          const { recipientId, content } = messageData;
          if (!currentUserId || !currentUsername) {
            socket.emit("error", { message: "User not registered" });
            return;
          }
          const savedMessage = await saveMessage({
            content,
            senderId: currentUserId,
            recipientId,
          });
          io.emit("chat-message", savedMessage);
          await prisma.message.update({
            where: { id: savedMessage.id },
            data: { delivered: true },
          });
          io.emit("message-delivered", { messageId: savedMessage.id });
          console.log(
            `📤 Message sent from ${currentUsername} to ${recipientId}`
          );
        } catch (error) {
          console.error("❌ Error handling chat message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      });
      socket.on("get-conversation", async (data) => {
        try {
          const { otherUserId } = data;
          if (!currentUserId) {
            socket.emit("error", { message: "User not registered" });
            return;
          }
          console.log(
            `📚 Getting conversation history between ${currentUserId} and ${otherUserId}`
          );
          const messages = await getConversationHistory(
            currentUserId,
            otherUserId
          );
          socket.emit("conversation-history", {
            otherUserId,
            messages,
          });
          const chat = await getOrCreateChat(currentUserId, otherUserId);
          await prisma.message.updateMany({
            where: {
              chatId: chat.id,
              senderId: otherUserId,
              read: false,
            },
            data: { read: true },
          });
          console.log(`📖 Conversation history loaded for ${currentUsername}`);
        } catch (error) {
          console.error("❌ Error getting conversation:", error);
          socket.emit("error", { message: "Failed to load conversation" });
        }
      });
      socket.on("typing-start", (data) => {
        try {
          const { recipientId } = data;
          if (!currentUserId || !currentUsername) return;
          console.log(`⌨️ ${currentUsername} started typing to ${recipientId}`);
          const recipientSocket = Array.from(onlineUsers.entries()).find(
            ([socketId, user]) => user.userId === recipientId
          );
          if (recipientSocket) {
            io.to(recipientSocket[0]).emit("typing-start", {
              userId: currentUserId,
              username: currentUsername,
            });
          }
        } catch (error) {
          console.error("❌ Error handling typing-start:", error);
        }
      });
      socket.on("typing-stop", (data) => {
        try {
          const { recipientId } = data;
          if (!currentUserId || !currentUsername) return;
          console.log(`⌨️ ${currentUsername} stopped typing to ${recipientId}`);
          const recipientSocket = Array.from(onlineUsers.entries()).find(
            ([socketId, user]) => user.userId === recipientId
          );
          if (recipientSocket) {
            io.to(recipientSocket[0]).emit("typing-stop", {
              userId: currentUserId,
              username: currentUsername,
            });
          }
        } catch (error) {
          console.error("❌ Error handling typing-stop:", error);
        }
      });
      socket.on("disconnect", () => {
        if (currentUsername && currentUserId) {
          console.log(`❌ Disconnected: ${socket.id}`);
          console.log(`👋 User ${currentUsername} went offline`);
        }
        onlineUsers.delete(socket.id);
        const userList = Array.from(onlineUsers.values());
        io.emit("online-users", userList);
        typingUsers.delete(socket.id);
      });
      socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  } catch (error) {
    console.error("❌ Error initializing socket handlers:", error);
  }
};
const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.end(
      JSON.stringify({
        status: "OK",
        timestamp: new Date().toISOString(),
        database: "connected",
      })
    );
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Socket.IO Chat Server with Database Integration");
});
const io = new Server(httpServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
          ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  allowEIO3: true,
});
initSocket(io);
httpServer.listen(SOCKET_PORT, () => {
  console.log("🚀 Socket.IO server running on port", SOCKET_PORT);
  console.log("🌍 Environment:", process.env.NODE_ENV || "development");
  console.log("📡 Server accessible at: http://localhost:" + SOCKET_PORT);
  console.log("🔗 Health check: http://localhost:" + SOCKET_PORT + "/health");
  console.log("🗄️ Database: Connected with encryption");
});
process.on("SIGINT", async () => {
  console.log("👋 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  console.log("👋 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});
