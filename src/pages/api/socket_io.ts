// import { Server } from "socket.io";

// let io: Server | undefined;
// const onlineUsers = new Map();

// export default function handler(req: any, res: any) {
//   if (!res.socket.server.io) {
//     console.log("🧠 Initializing Socket.io");

//     io = new Server(res.socket.server, {
//       path: "/api/socket_io",
//     });

//     io.on("connection", (socket) => {
//       console.log("✅ New socket connected:", socket.id);

//       socket.on("register-user", ({ userId, username }) => {
//         onlineUsers.set(socket.id, { userId, username });
//         io?.emit("online-users", Array.from(onlineUsers.values()));
//       });

//       socket.on("chat-message", ({ userId, message }) => {
//         const sender = onlineUsers.get(socket.id)?.username || "Anonymous";
//         io?.emit("chat-message", { sender, message });
//       });

//       socket.on("disconnect", () => {
//         onlineUsers.delete(socket.id);
//         io?.emit("online-users", Array.from(onlineUsers.values()));
//       });
//     });

//     res.socket.server.io = io;
//   } else {
//     console.log("♻️ Reusing existing Socket.io server");
//   }

//   res.end();
// }
