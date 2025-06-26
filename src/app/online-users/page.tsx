"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { io as socketIO } from "socket.io-client";
import type { Socket } from "socket.io";
import { Send, User, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// Message interface matching server structure
interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  content: string;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
}

interface OnlineUser {
  userId: string;
  username: string;
  socketId: string;
  lastSeen?: Date;
  unreadCount?: number;
}

interface TypingUser {
  userId: string;
  username: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const messageRef = useRef<HTMLInputElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userRegistered, setUserRegistered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Handle URL parameters and auto-select user
  useEffect(() => {
    if (!isInitialized || !searchParams) return;

    const userId = searchParams.get("userId");
    const username = searchParams.get("username");

    if (
      userId &&
      username &&
      (!selectedUser || selectedUser.userId !== userId)
    ) {
      // First try to find the user in current online users
      const user = onlineUsers.find((u) => u.userId === userId);
      if (user) {
        setSelectedUser(user);
        setOnlineUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.userId === user.userId ? { ...u, unreadCount: 0 } : u
          )
        );
        // Get conversation history
        if (socketRef.current) {
          socketRef.current.emit("get-conversation", { otherUserId: userId });
        }
      } else {
        // If user not found in current online users, create a temporary user object
        const tempUser: OnlineUser = {
          userId,
          username: decodeURIComponent(username),
          socketId: "",
          unreadCount: 0,
        };
        setSelectedUser(tempUser);
        // Still try to get conversation history
        if (socketRef.current) {
          socketRef.current.emit("get-conversation", { otherUserId: userId });
        }
      }
    }
  }, [onlineUsers, searchParams, isInitialized, selectedUser]);

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
  const handleUserSelect = useCallback(
    (user: OnlineUser) => {
      // Only update URL if it's different from current selection
      if (!selectedUser || selectedUser.userId !== user.userId) {
        setSelectedUser(user);
        setOnlineUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.userId === user.userId ? { ...u, unreadCount: 0 } : u
          )
        );

        // Get conversation history
        if (socketRef.current) {
          socketRef.current.emit("get-conversation", {
            otherUserId: user.userId,
          });
        }

        // Update URL to reflect selected user
        const newSearchParams = new URLSearchParams();
        newSearchParams.set("userId", user.userId);
        newSearchParams.set("username", encodeURIComponent(user.username));
        router.replace(`/chat?${newSearchParams.toString()}`, {
          scroll: false,
        });
      }
    },
    [router, selectedUser]
  );

  const sendMessage = useCallback(() => {
    if (
      !messageRef.current?.value.trim() ||
      !selectedUser ||
      !socketRef.current
    )
      return;

    const messageData = {
      recipientId: selectedUser.userId,
      content: messageRef.current.value.trim(),
    };

    socketRef.current.emit("chat-message", messageData);
    messageRef.current.value = "";

    // Stop typing indicator
    socketRef.current.emit("typing-stop", { recipientId: selectedUser.userId });
  }, [selectedUser]);

  const handleBackToLobby = () => {
    router.push("/");
  };

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!selectedUser || !socketRef.current) return;

    // Start typing
    socketRef.current.emit("typing-start", {
      recipientId: selectedUser.userId,
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit("typing-stop", {
          recipientId: selectedUser.userId,
        });
      }
    }, 3000);
  }, [selectedUser]);

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
          setUserRegistered(false);
        });

        // Handle user registration confirmation
        socket.on(
          "user-registered",
          ({ userId, username }: { userId: string; username: string }) => {
            console.log("✅ User registered:", { userId, username });
            setUserRegistered(true);

            // Request pending messages when user comes online
            socket.emit("get-pending-messages");
          }
        );

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

          // Mark as initialized after first online users update
          if (!isInitialized) {
            setIsInitialized(true);
          }
        });

        // Handle incoming chat messages
        socket.on("chat-message", (message: ChatMessage) => {
          console.log("📨 Received message:", message);
          setMessages((prev) => [...prev, message]);

          // Mark message as read if it's from the currently selected user
          if (selectedUser && message.senderId === selectedUser.userId) {
            socket.emit("mark-message-read", { messageId: message.id });
          } else if (message.senderId !== session.user.id) {
            // Update unread count if message is from another user and not currently chatting with them
            updateUnreadCount(message.senderId);
          }
        });

        // Handle conversation history
        socket.on(
          "conversation-history",
          ({
            otherUserId,
            messages: conversationMessages,
          }: {
            otherUserId: string;
            messages: ChatMessage[];
          }) => {
            console.log(
              "📚 Received conversation history:",
              conversationMessages
            );
            setMessages(conversationMessages);

            // Mark unread messages as read
            conversationMessages
              .filter((msg) => msg.recipientId === session.user.id && !msg.read)
              .forEach((msg) => {
                socket.emit("mark-message-read", { messageId: msg.id });
              });
          }
        );

        // Handle message status updates
        socket.on(
          "message-sent",
          ({
            messageId,
            delivered,
            timestamp,
          }: {
            messageId: string;
            delivered: boolean;
            timestamp: string;
          }) => {
            console.log("✅ Message sent confirmation:", {
              messageId,
              delivered,
            });
          }
        );

        socket.on(
          "message-delivered",
          ({
            messageId,
            deliveredTo,
            deliveredAt,
          }: {
            messageId: string;
            deliveredTo: string;
            deliveredAt: string;
          }) => {
            console.log("📬 Message delivered:", { messageId, deliveredTo });
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, delivered: true } : msg
              )
            );
          }
        );

        socket.on(
          "message-read",
          ({
            messageId,
            readBy,
            readAt,
          }: {
            messageId: string;
            readBy: string;
            readAt: string;
          }) => {
            console.log("👁️ Message read:", { messageId, readBy });
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, read: true } : msg
              )
            );
          }
        );

        // Handle typing indicators
        socket.on(
          "typing-start",
          ({ userId, username }: { userId: string; username: string }) => {
            setTypingUsers((prev) => {
              const exists = prev.some((user) => user.userId === userId);
              if (!exists) {
                return [...prev, { userId, username }];
              }
              return prev;
            });
          }
        );

        socket.on("typing-stop", ({ userId }: { userId: string }) => {
          setTypingUsers((prev) =>
            prev.filter((user) => user.userId !== userId)
          );
        });

        // Handle errors from server
        socket.on("error", ({ message }: { message: string }) => {
          console.error("❌ Server error:", message);
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [session, updateUnreadCount, isInitialized, selectedUser]);

  const filteredMessages = selectedUser
    ? messages.filter(
        (message) =>
          (message.senderId === session?.user?.id &&
            message.recipientId === selectedUser.userId) ||
          (message.senderId === selectedUser.userId &&
            message.recipientId === session?.user?.id)
      )
    : [];

  const currentUserTyping = typingUsers.find(
    (user) => user.userId === selectedUser?.userId
  );

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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLobby}
            className="p-1 h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Users className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-white">Online Users</h2>
          <div
            className={`ml-2 w-2 h-2 rounded-full ${
              isConnected && userRegistered ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </div>
        <div className="space-y-2">
          {onlineUsers.length === 0 ? (
            <div className="text-gray-500 text-sm">
              {!isConnected || !userRegistered
                ? "Connecting..."
                : "No users online"}
            </div>
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
                  <span className="truncate">{user.username}</span>
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              {selectedUser
                ? `Chat with ${selectedUser.username}`
                : "Select a user to chat"}
            </h1>
            {selectedUser && (
              <div className="flex items-center gap-1 text-sm text-green-500">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Online</span>
              </div>
            )}
          </div>
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
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.senderId === session.user.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {message.senderId !== session.user.id && (
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.senderId === session.user.id
                        ? "bg-purple-500 text-white"
                        : "bg-gray-800 text-gray-200"
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                      {message.senderId === session.user.id && (
                        <span>
                          {message.read ? "✓✓" : message.delivered ? "✓" : "⏳"}
                        </span>
                      )}
                    </div>
                  </div>
                  {message.senderId === session.user.id && (
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Typing indicator */}
            {currentUserTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-800 text-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-400">
                    {currentUserTyping.username} is typing...
                  </div>
                </div>
              </div>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                } else {
                  handleTyping();
                }
              }}
              disabled={!selectedUser}
            />
            <Button
              onClick={sendMessage}
              disabled={!selectedUser}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
