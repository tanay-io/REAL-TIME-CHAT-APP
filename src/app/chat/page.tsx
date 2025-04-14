"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { io as socketIO } from "socket.io-client";
import type { Socket as ClientSocket } from "socket.io-client";
import { Send, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  senderId: string;
  sender: string;
  message: string;
  timestamp: string;
  recipientId: string;
};

interface OnlineUser {
  userId: string;
  username: string;
  socketId: string;
  unreadCount?: number;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const messageRef = useRef<HTMLInputElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ClientSocket | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Update unread count when receiving a message
  const updateUnreadCount = useCallback(
    (senderId: string) => {
      setOnlineUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (
            user.userId === senderId &&
            user.userId !== selectedUser?.userId
          ) {
            return { ...user, unreadCount: (user.unreadCount || 0) + 1 };
          }
          return user;
        })
      );
    },
    [selectedUser]
  );

  // Reset unread count when selecting a user
  const handleUserSelect = useCallback((user: OnlineUser) => {
    setSelectedUser(user);
    setOnlineUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.userId === user.userId ? { ...u, unreadCount: 0 } : u
      )
    );
  }, []);

  const sendMessage = useCallback(() => {
    if (!messageRef.current?.value.trim() || !selectedUser) return;

    const messageData: Message = {
      senderId: session?.user?.id || "",
      sender: session?.user?.name || "Anonymous",
      message: messageRef.current.value.trim(),
      recipientId: selectedUser.userId,
      timestamp: new Date().toISOString(),
    };

    socketRef.current?.emit("chat-message", messageData);
    messageRef.current.value = "";
  }, [selectedUser, session]);

  // Initialize socket connection
  useEffect(() => {
    if (!session?.user?.id) return;

    const initializeSocket = async () => {
      try {
        // Wake up socket server
        await fetch("/api/socket");

        const socket = socketIO("http://localhost:3001", {
          path: "/api/socket",
          addTrailingSlash: false,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          transports: ["websocket", "polling"],
        });

        socket.on("connect", () => {
          console.log("✅ Socket connected:", socket.id);
          setIsConnected(true);

          // Register user
          socket.emit("register-user", {
            userId: session.user.id,
            username: session.user.name,
          });
        });

        socket.on("connect_error", (error: Error) => {
          console.error("❌ Connection error:", error);
          setIsConnected(false);
        });

        socket.on("disconnect", () => {
          console.log("❌ Socket disconnected");
          setIsConnected(false);
        });

        socket.on("online-users", (users: OnlineUser[]) => {
          console.log("📢 Received online users:", users);
          // Preserve unread counts when updating online users
          setOnlineUsers((prevUsers) => {
            const updatedUsers = users
              .filter((user) => user.userId !== session.user.id)
              .map((user) => {
                const existingUser = prevUsers.find(
                  (u) => u.userId === user.userId
                );
                return {
                  ...user,
                  unreadCount: existingUser?.unreadCount || 0,
                };
              });
            return updatedUsers;
          });
        });

        socket.on("chat-message", (message: Message) => {
          console.log("📨 Received message:", message);
          setMessages((prev) => [...prev, message]);
          // Update unread count if message is from another user
          if (message.senderId !== session.user.id) {
            updateUnreadCount(message.senderId);
          }
        });

        socketRef.current = socket;
      } catch (error) {
        console.error("❌ Failed to initialize socket:", error);
        setIsConnected(false);
      }
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        console.log("👋 Cleaning up socket connection");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session, updateUnreadCount]);

  const filteredMessages = selectedUser
    ? messages.filter(
        (message) =>
          (message.senderId === session?.user?.id &&
            message.recipientId === selectedUser.userId) ||
          (message.senderId === selectedUser.userId &&
            message.recipientId === session?.user?.id)
      )
    : [];

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-white">Online Users</h2>
          <div
            className={`ml-2 w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </div>
        <div className="space-y-2">
          {onlineUsers.length === 0 ? (
            <div className="text-gray-500 text-sm">No users online</div>
          ) : (
            onlineUsers.map((user) => (
              <button
                key={user.userId}
                onClick={() => handleUserSelect(user)}
                className={`w-full p-2 rounded-lg text-left transition-colors relative ${
                  selectedUser?.userId === user.userId
                    ? "bg-purple-500 text-white"
                    : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{user.username}</span>
                  {(user.unreadCount ?? 0) > 0 && (
                    <div className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {user.unreadCount}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-gray-800 p-4">
          <h1 className="text-2xl font-bold text-white">
            {selectedUser
              ? `Chat with ${selectedUser.username}`
              : "Select a user to chat"}
          </h1>
        </header>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                {selectedUser
                  ? "No messages yet. Start the conversation!"
                  : "Select a user to start chatting"}
              </div>
            ) : (
              filteredMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    message.sender === session.user.name
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {message.sender !== session.user.name && (
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === session.user.name
                        ? "bg-purple-500 text-white"
                        : "bg-gray-800 text-gray-200"
                    }`}
                  >
                    <div className="text-sm">{message.message}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {message.sender === session.user.name && (
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-gray-800 p-4">
          <div className="flex gap-2">
            <Input
              ref={messageRef}
              type="text"
              placeholder={
                selectedUser
                  ? `Message ${selectedUser.username}...`
                  : "Select a user to chat"
              }
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={!selectedUser}
            />
            <Button
              onClick={sendMessage}
              className="bg-purple-500 hover:bg-purple-600 text-white"
              disabled={!selectedUser}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
