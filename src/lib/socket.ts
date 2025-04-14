import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";

declare global {
  var socketIoInstance: SocketIOServer | undefined;
}

export const initSocket = (io: SocketIOServer) => {
  console.log("🧠 Initializing Socket.io handlers");

  try {
    // Store online users in memory
    const onlineUsers = new Map<
      string,
      { userId: string; username: string; socketId: string }
    >();

    io.on("connection", (socket) => {
      console.log("✅ New connection:", socket.id);

      // Send current online users to new connection
      socket.emit("online-users", Array.from(onlineUsers.values()));

      socket.on(
        "register-user",
        ({ userId, username }: { userId: string; username: string }) => {
          if (!userId || !username) return;

          console.log(`👤 Registering user: ${username} (${userId})`);

          // Remove old socket if exists
          if (onlineUsers.has(userId)) {
            const oldSocketId = onlineUsers.get(userId)?.socketId;
            if (oldSocketId && oldSocketId !== socket.id) {
              const oldSocket = io.sockets.sockets.get(oldSocketId);
              if (oldSocket) {
                console.log("🔌 Disconnecting old socket:", oldSocketId);
                oldSocket.disconnect();
              }
            }
          }

          // Add new user
          onlineUsers.set(userId, { userId, username, socketId: socket.id });

          // Broadcast updated list
          io.emit("online-users", Array.from(onlineUsers.values()));
        }
      );

      socket.on(
        "chat-message",
        (message: { recipientId: string; content: string }) => {
          console.log("📨 Received message:", message);
          const recipient = onlineUsers.get(message.recipientId);
          if (recipient) {
            io.to(recipient.socketId).emit("chat-message", message);
          }
          // Also send back to sender for their own UI
          socket.emit("chat-message", message);
        }
      );

      socket.on("disconnect", () => {
        console.log("❌ Disconnected:", socket.id);
        for (const [userId, user] of onlineUsers.entries()) {
          if (user.socketId === socket.id) {
            onlineUsers.delete(userId);
            io.emit("online-users", Array.from(onlineUsers.values()));
            break;
          }
        }
      });
    });

    console.log("✅ Socket.IO handlers initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Socket.IO handlers:", error);
    throw error;
  }
};
