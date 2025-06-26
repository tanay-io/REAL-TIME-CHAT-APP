import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
const prisma = new PrismaClient();
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-super-secret-32-char-key-!!!";
// Encryption utilities
const simpleEncrypt = (text: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
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
const simpleDecrypt = (encryptedData: string): string => {
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
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
// Database helper functions
const getOrCreateChat = async (userId1: string, userId2: string) => {
  try {
    // Try to find existing chat
    let chat = await prisma.$queryRaw`
      SELECT c.* FROM chats c
      INNER JOIN chat_participants cp1 ON c.id = cp1."chatId" AND cp1."userId" = ${userId1}
      INNER JOIN chat_participants cp2 ON c.id = cp2."chatId" AND cp2."userId" = ${userId2}
      LIMIT 1
    `;
    if (Array.isArray(chat) && chat.length > 0) {
      return chat[0];
    }
    // Create new chat
    const newChat = await prisma.$queryRaw`
      INSERT INTO chats (id, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), NOW(), NOW())
      RETURNING *
    `;
    const chatId = Array.isArray(newChat) ? newChat[0].id : null;
    if (chatId) {
      // Add participants
      await prisma.$queryRaw`
        INSERT INTO chat_participants (id, "userId", "chatId")
        VALUES
          (gen_random_uuid(), ${userId1}, ${chatId}),
          (gen_random_uuid(), ${userId2}, ${chatId})
      `;
    }
    return Array.isArray(newChat) ? newChat[0] : newChat;
  } catch (error) {
    console.error("Error with chat:", error);
    throw error;
  }
};
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    switch (action) {
      case "saveMessage": {
        const { content, senderId, recipientId } = data;
        // Get or create chat
        const chat = await getOrCreateChat(senderId, recipientId);
        const chatId = typeof chat === "object" ? chat.id : chat;
        // Encrypt content
        const encryptedContent = simpleEncrypt(content);
        // Save message
        const savedMessage = await prisma.$queryRaw`
          INSERT INTO messages (id, "encryptedContent", "senderId", "recipientId", "chatId", delivered, read, "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${encryptedContent}, ${senderId}, ${recipientId}, ${chatId}, false, false, NOW(), NOW())
          RETURNING *
        `;
        // Get sender info
        const sender = await prisma.$queryRaw`
          SELECT username FROM "User" WHERE id = ${senderId}
        `;
        const messageArray = Array.isArray(savedMessage)
          ? savedMessage
          : [savedMessage];
        const senderArray = Array.isArray(sender) ? sender : [sender];
        if (messageArray.length > 0 && senderArray.length > 0) {
          const decryptedMessage = {
            id: messageArray[0].id,
            content: simpleDecrypt(messageArray[0].encryptedContent),
            senderId: messageArray[0].senderId,
            senderUsername: senderArray[0].username,
            recipientId: messageArray[0].recipientId,
            delivered: messageArray[0].delivered,
            read: messageArray[0].read,
            timestamp: messageArray[0].createdAt,
          };
          return NextResponse.json({
            success: true,
            message: decryptedMessage,
          });
        }
        return NextResponse.json({
          success: false,
          error: "Failed to save message",
        });
      }
      case "getConversation": {
        const { userId1, userId2 } = data;
        // Get chat
        const chat = await getOrCreateChat(userId1, userId2);
        const chatId = typeof chat === "object" ? chat.id : chat;
        // Get messages
        const messages = await prisma.$queryRaw`
          SELECT m.*, u.username as "senderUsername"
          FROM messages m
          INNER JOIN "User" u ON m."senderId" = u.id
          WHERE m."chatId" = ${chatId}
          ORDER BY m."createdAt" ASC
        `;
        const messageArray = Array.isArray(messages) ? messages : [];
        const decryptedMessages = messageArray.map((msg: any) => ({
          id: msg.id,
          content: simpleDecrypt(msg.encryptedContent),
          senderId: msg.senderId,
          senderUsername: msg.senderUsername,
          recipientId: msg.recipientId,
          delivered: msg.delivered,
          read: msg.read,
          timestamp: msg.createdAt,
        }));
        return NextResponse.json({
          success: true,
          messages: decryptedMessages,
        });
      }
      case "markAsRead": {
        const { userId, otherUserId } = data;
        const chat = await getOrCreateChat(userId, otherUserId);
        const chatId = typeof chat === "object" ? chat.id : chat;
        await prisma.$queryRaw`
          UPDATE messages
          SET read = true, "updatedAt" = NOW()
          WHERE "chatId" = ${chatId} AND "senderId" = ${otherUserId} AND read = false
        `;
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    console.error("Database API error:", error);
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage });
  }
}
