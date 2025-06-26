"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import io from "socket.io-client";
import type { Socket } from "socket.io-client";
import { Send, User, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
type Message = {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  content: string;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
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
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const messageRef = useRef<HTMLInputElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
const [hasFetchedMessages, setHasFetchedMessages] = useState(false);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);
  useEffect(() => {
    if (!isInitialized || !searchParams) return;
    const userId = searchParams.get("userId");
    const username = searchParams.get("username");
    if (
      userId &&
      username &&
      (!selectedUser || selectedUser.userId !== userId)
    ) {
      const user = onlineUsers.find((u) => u.userId === userId);
      if (user) {
        setSelectedUser(user);
        setOnlineUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.userId === user.userId ? { ...u, unreadCount: 0 } : u
          )
        );
        if (socketRef.current) {
          socketRef.current.emit("get-conversation", {
            otherUserId: user.userId,
          });
        }
      } else {
        const tempUser: OnlineUser = {
          userId,
          username: decodeURIComponent(username),
          socketId: "",
          unreadCount: 0,
        };
        setSelectedUser(tempUser);
      }
    }
  }, [onlineUsers, searchParams, isInitialized, selectedUser]);
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
  const handleUserSelect = useCallback(
    (user: OnlineUser) => {
      if (!selectedUser || selectedUser.userId !== user.userId) {
        setSelectedUser(user);
        setOnlineUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.userId === user.userId ? { ...u, unreadCount: 0 } : u
          )
        );
        if (socketRef.current) {
          socketRef.current.emit("get-conversation", {
            otherUserId: user.userId,
          });
        }
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
  const handleTyping = useCallback(() => {
    if (!selectedUser || !socketRef.current) return;
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit("typing-start", {
        recipientId: selectedUser.userId,
      });
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit("typing-stop", {
            recipientId: selectedUser.userId,
          });
        }
        setIsTyping(false);
      }, 3000);
    }
  }, [selectedUser, isTyping]);
  const sendMessage = useCallback(() => {
    if (
      !messageRef.current?.value.trim() ||
      !selectedUser ||
      !socketRef.current
    )
      return;
    const messageContent = messageRef.current.value.trim();
    if (isTyping) {
      socketRef.current.emit("typing-stop", {
        recipientId: selectedUser.userId,
      });
      setIsTyping(false);
    }
    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: session?.user?.id || "",
      senderUsername: session?.user?.name || "You",
      recipientId: selectedUser.userId,
      content: messageContent,
      timestamp: new Date(),
      delivered: false,
      read: false,
    };
    setMessages((prev) => [...prev, newMessage]);
    socketRef.current.emit("chat-message", {
      recipientId: selectedUser.userId,
      content: messageContent,
    });
    messageRef.current.value = "";
  }, [selectedUser, isTyping, session?.user?.id, session?.user?.name]);
  const handleBackToLobby = () => {
    router.push("/");
  };
  useEffect(() => {
    if (!session?.user?.id) return;
    if (socketRef.current && socketRef.current.connected) {
      console.log("📡 Using existing socket connection:", socketRef.current.id);
      setIsConnected(true);
      return;
    }
    const initializeSocket = async () => {
      try {
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        }
        const socket = io("http://localhost:3001", {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          transports: ["polling", "websocket"],
          forceNew: false,
          timeout: 10000,
          autoConnect: true,
        });
        socket.on("connect", () => {
          console.log("✅ Socket connected:", socket.id);
          setIsConnected(true);
          socket.emit("register-user", {
            userId: session.user.id,
            username: session.user.name,
          });
        });
        socket.on(
          "user-registered",
          ({ userId, username }: { userId: string; username: string }) => {
            console.log("✅ User registered successfully:", username);
          }
        );
        socket.on("connect_error", (error: Error) => {
          console.error("❌ Connection error:", error.message);
          setIsConnected(false);
        });
        socket.on("disconnect", (reason: string) => {
          console.log("❌ Socket disconnected:", reason);
          setIsConnected(false);
        });
        socket.on("reconnect", (attemptNumber: number) => {
          console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
          setIsConnected(true);
          socket.emit("register-user", {
            userId: session.user.id,
            username: session.user.name,
          });
        });
        socket.on("online-users", (users: OnlineUser[]) => {
          console.log("📢 Received online users:", users);
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
          if (!isInitialized) {
            setIsInitialized(true);
          }
        });
        socket.on("chat-message", async (message: Message) => {
          console.log("📨 Received message:", message);
          try {
            await fetch("/api/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "saveMessage",
                content: message.content,
                senderId: message.senderId,
                senderUsername: message.senderUsername,
                recipientId: message.recipientId,
              }),
            });
            console.log("🔐 Message encrypted and saved to database");
          } catch (error) {
            console.error("Failed to save encrypted message:", error);
          }
          setMessages((prev) => {
            const isAlreadyPresent = prev.some(
              (msg) =>
                msg.senderId === message.senderId &&
                msg.recipientId === message.recipientId &&
                msg.content === message.content &&
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                    new Date(message.timestamp).getTime()
                ) < 5000
            );
            if (isAlreadyPresent) {
              return prev.map((msg) =>
                msg.senderId === message.senderId &&
                msg.recipientId === message.recipientId &&
                msg.content === message.content &&
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                    new Date(message.timestamp).getTime()
                ) < 5000
                  ? { ...message }
                  : msg
              );
            } else {
              return [...prev, message];
            }
          });
          if (message.senderId !== session.user.id) {
            updateUnreadCount(message.senderId);
          }
        });
        socket.on(
          "conversation-history",
          async ({
            otherUserId,
            messages: conversationMessages,
          }: {
            otherUserId: string;
            messages: Message[];
          }) => {
            console.log(
              `📚 Loaded conversation history with ${otherUserId}:`,
              conversationMessages
            );
            try {
              const response = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "getConversation",
                  userId1: session.user.id,
                  userId2: otherUserId,
                }),
              });
              const result = await response.json();
              if (result.success && result.messages.length > 0) {
                setMessages(result.messages);
                return;
              }
            } catch (error) {
              console.error("Failed to load from database:", error);
            }
            setMessages(conversationMessages);
          }
        );
        socket.on(
          "message-delivered",
          ({ messageId }: { messageId: string }) => {
            console.log("✅ Message delivered:", messageId);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, delivered: true } : msg
              )
            );
          }
        );
        socket.on("message-read", ({ messageId }: { messageId: string }) => {
          console.log("👁️ Message read:", messageId);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, read: true } : msg
            )
          );
        });
        socket.on(
          "typing-start",
          ({ userId, username }: { userId: string; username: string }) => {
            console.log(`⌨️ ${username} is typing...`);
            setTypingUsers((prev) => [
              ...prev.filter((u) => u !== username),
              username,
            ]);
          }
        );
        socket.on(
          "typing-stop",
          ({ userId, username }: { userId: string; username: string }) => {
            console.log(`⌨️ ${username} stopped typing`);
            setTypingUsers((prev) => prev.filter((u) => u !== username));
          }
        );
        socket.on("error", ({ message }: { message: string }) => {
          console.error("❌ Socket error:", message);
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
        console.log("🧹 Cleaning up event listeners");
        socketRef.current.off("online-users");
        socketRef.current.off("chat-message");
        socketRef.current.off("conversation-history");
        socketRef.current.off("message-delivered");
        socketRef.current.off("message-read");
        socketRef.current.off("typing-start");
        socketRef.current.off("typing-stop");
        socketRef.current.off("error");
      }
    };
  }, [session?.user?.id]);
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socketRef.current) {
        console.log("👋 Page unloading - disconnecting socket");
        socketRef.current.disconnect();
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("📱 Tab hidden - keeping connection alive");
      } else {
        console.log(
          "📱 Tab visible - socket status:",
          socketRef.current?.connected
        );
        if (socketRef.current && !socketRef.current.connected) {
          console.log("🔄 Reconnecting socket...");
          socketRef.current.connect();
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (socketRef.current) {
        console.log("🔌 Component unmounting - disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);
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
      {}
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
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
            title={isConnected ? "Connected" : "Disconnected"}
          />
        </div>
        <div className="space-y-2">
          {onlineUsers.length === 0 ? (
            <div className="text-gray-500 text-sm">
              {isConnected ? "No users online" : "Connecting..."}
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
      {}
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
          {}
          {typingUsers.length > 0 &&
            selectedUser &&
            typingUsers.includes(selectedUser.username) && (
              <div className="text-sm text-gray-400 mt-1">
                {selectedUser.username} is typing...
              </div>
            )}
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
              filteredMessages.map((message, index) => {
                const isOwnMessage = message.senderId === session.user.id;
                return (
                  <div
                    key={message.id || index}
                    className={`flex items-start gap-3 ${
                      isOwnMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isOwnMessage
                          ? "bg-purple-500 text-white"
                          : "bg-gray-800 text-gray-200"
                      }`}
                    >
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                        <span>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        {isOwnMessage && (
                          <span className="ml-1">
                            {message.id.startsWith("temp-")
                              ? "⏳"
                              : message.read
                              ? "✓✓"
                              : message.delivered
                              ? "✓"
                              : "⏳"}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOwnMessage && (
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })
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
              onChange={handleTyping}
              disabled={!selectedUser || !isConnected}
            />
            <Button
              onClick={sendMessage}
              className="bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
              disabled={!selectedUser || !isConnected}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          {!isConnected && (
            <div className="text-xs text-red-400 mt-1">
              Disconnected - Attempting to reconnect...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
