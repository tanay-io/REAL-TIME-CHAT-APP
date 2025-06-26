import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
// Simple in-memory storage for now - will be replaced with encrypted database storage
const messageStore = new Map<string, any[]>();
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-super-secret-32-char-key-!!!";
// Simple encryption function
const encryptMessage = (text: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY.substring(0, 32)),
      iv
    );
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    return text; // Fallback to plain text
  }
};
// Simple decryption function
const decryptMessage = (encryptedData: string): string => {
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      return encryptedData; // Probably not encrypted
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY.substring(0, 32)),
      iv
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return encryptedData; // Fallback to original
  }
};
const getConversationKey = (userId1: string, userId2: string) => {
  return [userId1, userId2].sort().join("-");
};
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    switch (action) {
      case "saveMessage": {
        const { content, senderId, recipientId, senderUsername } = data;
        const conversationKey = getConversationKey(senderId, recipientId);
        if (!messageStore.has(conversationKey)) {
          messageStore.set(conversationKey, []);
        }
        const encryptedContent = encryptMessage(content);
        const message = {
          id: crypto.randomUUID(),
          content, // Store decrypted for API response
          encryptedContent, // Store encrypted version
          senderId,
          senderUsername: senderUsername || "User",
          recipientId,
          delivered: true,
          read: false,
          timestamp: new Date().toISOString(),
        };
        messageStore.get(conversationKey)?.push({
          ...message,
          content: encryptedContent, // Store encrypted in memory
        });
        console.log(
          `💾 Saved encrypted message: ${senderId} -> ${recipientId}`
        );
        return NextResponse.json({ success: true, message });
      }
      case "getConversation": {
        const { userId1, userId2 } = data;
        const conversationKey = getConversationKey(userId1, userId2);
        const messages = messageStore.get(conversationKey) || [];
        // Decrypt messages for response
        const decryptedMessages = messages.map((msg) => ({
          ...msg,
          content: decryptMessage(msg.content), // Decrypt for display
        }));
        console.log(
          `📚 Retrieved ${decryptedMessages.length} encrypted messages for conversation ${conversationKey}`
        );
        return NextResponse.json({
          success: true,
          messages: decryptedMessages,
        });
      }
      case "markAsRead": {
        const { userId, otherUserId } = data;
        const conversationKey = getConversationKey(userId, otherUserId);
        const messages = messageStore.get(conversationKey) || [];
        // Mark messages as read
        messages.forEach((msg) => {
          if (msg.senderId === otherUserId) {
            msg.read = true;
          }
        });
        console.log(
          `📖 Marked messages as read in conversation ${conversationKey}`
        );
        return NextResponse.json({ success: true });
      }
      case "getStats": {
        const totalConversations = messageStore.size;
        const totalMessages = Array.from(messageStore.values()).reduce(
          (sum, msgs) => sum + msgs.length,
          0
        );
        return NextResponse.json({
          success: true,
          stats: {
            totalConversations,
            totalMessages,
            encrypted: true,
          },
        });
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    console.error("Messages API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
