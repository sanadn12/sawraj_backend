import user from "../models/userModel.js";
import bcrypt from "bcrypt";
import  jwt from "jsonwebtoken";
import { generateAndSendOTP } from "../services/otpGenerator.js";
import { sendWelcomeEmail } from "../services/registered.js";
import { generateAndStoreOTP,otpStore, getOtpStore,saveOtpStoreToFile ,loadOtpStoreFromFile} from "../services/otpStore.js";

import { Readable } from 'stream';






export const createAccount = async(req,res)=> {
      const {email,password,name,phone} = req.body;

      try {
        const existingemail  = await user.findOne({
            email

        });
        if(existingemail){
            return res.status(409).json({ message: "User with this email already exists" });
        }


          const existingphone  = await user.findOne({
            phone

        });
        if(existingphone){
            return res.status(409).json({ message: "User with this phone number already exists" });
        }


        const hashedPassword = await bcrypt.hash(password, 10);
const newUser = new user({ email, password: hashedPassword, name,phone,verified: false });
        
        await newUser.save();

        const otp = await generateAndSendOTP(email, name);  // Send OTP and store it
        generateAndStoreOTP(email, otp);

        res.status(201).json({ message: "User created temporarily. OTP sent to your email for verification. " });
        
      } catch (error) {
        console.error("error in creating user");
        res.status(500).json({ message: "Error in creating user", error });
            
        
        
      }
}



export const verifyotp = async (req, res) => {
  const { email, otp } = req.body;
  
  try {
    loadOtpStoreFromFile();

    // Check if OTP exists for the email
    if (!otpStore[email]) {
      return res.status(400).json({ message: "OTP not found. Please generate a new one." });
    }

    // Check if OTP has expired
    if (Date.now() > otpStore[email].expiresAt) {
      
      // Remove expired OTP
      delete otpStore[email];
      saveOtpStoreToFile();

      // Optionally delete user
      const deleted = await user.deleteOne({ email });

      return res.status(400).json({ message: "OTP has expired. Your account has been deleted. Please register again." });
    }

    // Check if OTP matches
    if (otpStore[email].otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }


    // OTP is valid, activate user
    const updateResult = await user.updateOne({ email }, { verified: true });

    // Remove OTP after successful verification
    delete otpStore[email];
    saveOtpStoreToFile();

    const User = await user.findOne({ email });
    if (!User) {
      return res.status(404).json({ message: "User not found after OTP verification." });
    }

    await sendWelcomeEmail(email, User.name);

    res.status(200).json({ message: "OTP verified successfully. Your account is now active." });

  } catch (error) {
    res.status(500).json({ message: "Error in OTP verification", error });
  }
};




export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const User = await user.findOne({email});


    if (!User) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!User.verified) {
      return res.status(403).json({ message: 'Your account is not verified. Please verify your email.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, User.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: User.id, email: User.email, role: User.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    res.status(200).json({ message: 'Login successful', token  });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
  

export const getUser = async (req, res) => {
  try {
    const userId = req.user?.id;  

    if (!userId) {
      return res.status(400).json({ message: "User ID not found in token" });
    }

    const foundUser = await user.findById(userId).select("-password");

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user: foundUser });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const editUser = async (req, res) => {
const userId = req.user?.id;
if (!userId) {
      return res.status(401).json({ error: "Unauthorized: No user ID found" });
    }
  const { name, address } = req.body;  

  if (!name || !address) {
    return res.status(400).json({ error: 'Name and address are required' });
  }

  try {
    const updatedUser = await user.findByIdAndUpdate(
      userId,
      { name, address },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};







export const editProfilePic = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: No user ID found" });
  }

  const { profilePicture } = req.body;
  if (!profilePicture) {
    return res.status(400).json({ error: "No profile picture provided" });
  }

  try {
    const existingUser = await user.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    existingUser.profilePicture = profilePicture; 
    const updatedUser = await existingUser.save();

    res.status(200).json({
      message: "Profile picture updated successfully!",
      _id: updatedUser._id,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



export const getAllUsers = async (req, res) => {
  try {
     if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You do not have permission to access this resource." });
    }

    // Get only users with role = "user"
    const users = await user.find({ role: "user" }).select("-password");
    const userCount = await user.countDocuments({ role: "user" });

    res.status(200).json({
      success: true,
      count: userCount,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};