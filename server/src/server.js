const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Enable CORS for all origins in dev
    methods: ["GET", "POST"]
  }
});

function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      // Notify others in the room that a new peer has joined
      socket.to(roomId).emit("peer-connected", socket.id);
      
      // Send the list of existing peers in the room to the new user
      const clients = io.sockets.adapter.rooms.get(roomId);
      if (clients) {
        // Exclude the new user themselves
        const otherClients = [...clients].filter(id => id !== socket.id);
        if (otherClients.length > 0) {
           // We could emit existing peers back to the new socket if needed
        }
      }
    });

    socket.on("webrtc-offer", (data) => {
      // data: { target: socketId, sdp: RTCSessionDescription }
      socket.to(data.target).emit("webrtc-offer", {
        sender: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on("webrtc-answer", (data) => {
      socket.to(data.target).emit("webrtc-answer", {
        sender: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on("ice-candidate", (data) => {
      socket.to(data.target).emit("ice-candidate", {
        sender: socket.id,
        candidate: data.candidate,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      // Usually you'd notify rooms the user was in
    });
  });
}

setupSocketHandlers(io);

// Only start listening if this file is run directly (not in tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
  });
}

module.exports = { app, server, io, setupSocketHandlers };
