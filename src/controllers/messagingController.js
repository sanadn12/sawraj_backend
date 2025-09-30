import Messaging from "../models/messagingModel.js";

// Create or get chat
export const createOrGetChat = async (req, res) => {
  const { userId } = req.body;
  const currentUserId = req.user.id;

  if (!userId) return res.status(400).json({ message: "UserId is required" });

  let chat = await Messaging.findOne({
    participants: { $all: [currentUserId, userId] }
  }).populate("participants", "-password");

  if (!chat) {
    chat = await Messaging.create({ participants: [currentUserId, userId] });
    chat = await chat.populate("participants", "-password");
  }

  res.status(200).json(chat);
};

// Get all chats of user
export const getUserChats = async (req, res) => {
  const currentUserId = req.user.id;
  const chats = await Messaging.find({ participants: currentUserId })
    .populate("participants", "-password")
    .sort({ updatedAt: -1 });

  res.status(200).json(chats);
};

// Get messages of a chat
export const getChatMessages = async (req, res) => {
  const { chatId } = req.params;
  const currentUserId = req.user.id;

  const chat = await Messaging.findById(chatId).populate("messages.sender", "-password");
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  if (!chat.participants.some(p => p._id.toString() === currentUserId))
    return res.status(403).json({ message: "Not authorized" });

  res.status(200).json(chat.messages);
};
