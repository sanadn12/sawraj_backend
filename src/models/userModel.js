import mongoose from "mongoose";
import plan from "../models/planModel.js";


const postSchema = new mongoose.Schema(
  {
    image: { type: String }, // optional
    caption: { type: String, trim: true }, // optional
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);


const userModel = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: String,
    gstNumber: String, 
    website: String,
        followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    followings: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

    bio: String,
    name: String,
    address: String,
    profilePicture : String,
    phone: String,
    verified: { type: Boolean, default: false },   
     role: {
      type: String,
      enum: ["user", "admin"], 
      default: "user"},      
        plan: { type: mongoose.Schema.Types.ObjectId, ref: "plan" }, 
    subscriptionValidTill: { type: Date }, 
    listingsCreatedThisMonth: { type: Number, default: 0 }, 

    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
publicProfile: { type: Boolean, default: false },
    posts: [postSchema],

    
    },
     { timestamps: true ,


});

const user = mongoose.model("user", userModel);

export default user;