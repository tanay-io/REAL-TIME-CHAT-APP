import {
  PrismaClient,
  Chat,
  Message,
  User as PrismaUser,
  ChatParticipant as PrismaChatParticipant,
} from "@prisma/client";
import { MessageEncryption } from "./encryption";
const prisma = new PrismaClient();
export interface MessageData {
  id?: string;
  content: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  delivered?: boolean;
  read?: boolean;
  timestamp?: Date;
}
export interface StoredMessage {
  id: string;
  content: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  delivered: boolean;
  read: boolean;
  timestamp: Date;
}
interface User {
  id: string;
  username: string;
}
interface ChatParticipant {
  userId: string;
  user: User;
}
interface LastMessage {
  content: string;
  timestamp: Date;
  senderId: string;
  senderUsername: string;
}
interface UserChat {
  chatId: string;
  otherUser?: User;
  lastMessage: LastMessage | null;
  updatedAt: Date;
}
type ChatWithParticipants = Chat & {
  participants: (PrismaChatParticipant & { user: PrismaUser })[];
  messages: (Message & { sender: PrismaUser })[];
};
type ChatWithParticipantsSimple = Chat & {
  participants: PrismaChatParticipant[];
};
export class MessageService {
  static async getOrCreateChat(
    userId1: string,
    userId2: string
  ): Promise<ChatWithParticipantsSimple> {
    try {
      const chats = await prisma.chat.findMany({
        where: {
          participants: {
            some: {
              userId: userId1,
            },
          },
        },
        include: {
          participants: true,
        },
      });
      const existingChat = chats.find(
        (chat) =>
          chat.participants.some((p) => p.userId === userId2) &&
          chat.participants.length === 2
      );
      if (existingChat) return existingChat;
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
  }
  static async saveMessage(messageData: MessageData): Promise<StoredMessage> {
    try {
      const chat = await this.getOrCreateChat(
        messageData.senderId,
        messageData.recipientId
      );
      const encryptedContent = MessageEncryption.simpleEncrypt(
        messageData.content
      );
      const savedMessage = await prisma.message.create({
        data: {
          encryptedContent,
          senderId: messageData.senderId,
          recipientId: messageData.recipientId,
          chatId: chat.id,
          delivered: messageData.delivered ?? false,
          read: messageData.read ?? false,
        },
        include: {
          sender: true,
          recipient: true,
        },
      });
      return {
        id: savedMessage.id,
        content: MessageEncryption.simpleDecrypt(savedMessage.encryptedContent),
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
  }
  static async getConversationHistory(
    userId1: string,
    userId2: string
  ): Promise<StoredMessage[]> {
    try {
      const chat = await this.getOrCreateChat(userId1, userId2);
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
        content: MessageEncryption.simpleDecrypt(message.encryptedContent),
        senderId: message.senderId,
        senderUsername: message.sender.username,
        recipientId: message.recipientId,
        delivered: message.delivered,
        read: message.read,
        timestamp: message.createdAt,
      }));
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      throw error;
    }
  }
  static async markAsDelivered(messageId: string): Promise<void> {
    try {
      await prisma.message.update({
        where: { id: messageId },
        data: { delivered: true },
      });
    } catch (error) {
      console.error("Error marking message as delivered:", error);
      throw error;
    }
  }
  static async markAsRead(messageId: string): Promise<void> {
    try {
      await prisma.message.update({
        where: { id: messageId },
        data: { read: true },
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw error;
    }
  }
  static async markConversationAsRead(
    userId: string,
    otherUserId: string
  ): Promise<void> {
    try {
      const chat = await this.getOrCreateChat(userId, otherUserId);
      await prisma.message.updateMany({
        where: {
          chatId: chat.id,
          senderId: otherUserId,
          recipientId: userId,
          read: false,
        },
        data: {
          read: true,
        },
      });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      throw error;
    }
  }
  static async getUserChats(userId: string): Promise<UserChat[]> {
    try {
      const chats = await prisma.chat.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            include: {
              sender: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
      return chats.map((chat: ChatWithParticipants): UserChat => {
        const otherParticipant = chat.participants.find(
          (p) => p.userId !== userId
        );
        const lastMessage = chat.messages[0];
        return {
          chatId: chat.id,
          otherUser: otherParticipant
            ? {
                id: otherParticipant.user.id,
                username: otherParticipant.user.username,
              }
            : undefined,
          lastMessage: lastMessage
            ? {
                content: MessageEncryption.simpleDecrypt(
                  lastMessage.encryptedContent
                ),
                timestamp: lastMessage.createdAt,
                senderId: lastMessage.senderId,
                senderUsername: lastMessage.sender.username,
              }
            : null,
          updatedAt: chat.updatedAt,
        };
      });
    } catch (error) {
      console.error("Error getting user chats:", error);
      throw error;
    }
  }
}
export default MessageService;
