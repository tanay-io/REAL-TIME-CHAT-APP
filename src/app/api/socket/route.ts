import { NextResponse } from "next/server";
import { createServer } from "http";
import { Server } from "socket.io";
import { initSocket } from "@/lib/socket";

const httpServer = createServer();

const io = new Server(httpServer, {
  path: "/api/socket",
  addTrailingSlash: false,
  transports: ["websocket", "polling"],
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true,
});

initSocket(io);

const port = process.env.SOCKET_PORT || 3001;
httpServer.listen(port, () => {
  console.log(`✅ Socket.IO server running on port ${port}`);
});

export async function GET(req: Request) {
  const origin = req.headers.get("origin") || "";

  if (req.headers.get("upgrade") === "websocket") {
    return new Response(null, {
      status: 101,
      headers: {
        Upgrade: "websocket",
        Connection: "Upgrade",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  return new Response("Socket server is running", {
    headers: {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export const dynamic = "force-dynamic";

export const config = {
  api: {
    bodyParser: false,
  },
};