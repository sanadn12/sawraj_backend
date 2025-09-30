import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false }, 
  },
  { timestamps: true } 
);

const messagingSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }
    ], 
    messages: [messageSchema],
  },
  { timestamps: true }
);

const Messaging = mongoose.model("messaging", messagingSchema);
export default Messaging;
