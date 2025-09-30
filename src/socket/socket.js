// socket.js
import { Server } from "socket.io";
import Messaging from "../models/messagingModel.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "https://sawraj.in", "https://www.sawraj.in"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // console.log("New client connected:", socket.id);

    // Join a chat room
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
      // console.log(`User joined chat ${chatId}`);
    });

    // Send message
    socket.on("sendMessage", async ({ chatId, senderId, text }) => {
      if (!chatId || !senderId || !text) return;

      const chat = await Messaging.findById(chatId);
      if (!chat) return;

      const receiver = chat.participants.find((p) => p.toString() !== senderId);

      const newMessage = {
        sender: senderId,
        receiver,
        text,
        chatId,
        createdAt: new Date(),
      };

      chat.messages.push(newMessage);
      await chat.save();

      // Broadcast to all in room
socket.to(chatId).emit("receiveMessage", { ...newMessage, chatId });
    });

    socket.on("disconnect", () => {
      // console.log("Client disconnected:", socket.id);
    });
  });
};

// Export IO for other files if needed
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};
