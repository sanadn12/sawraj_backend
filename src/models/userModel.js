import mongoose from "mongoose";

const userModel = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: String,
    name: String,
    address: String,
    profilePicture : String,
    phone: String,
    verified: { type: Boolean, default: false }, 
 }, { timestamps: true ,


});

const user = mongoose.model("user", userModel);

export default user;