import user from "../models/userModel.js";
import bcrypt from "bcrypt";
import  jwt from "jsonwebtoken";
import { generateAndSendOTP } from "../services/otpGenerator.js";
import { sendWelcomeEmail } from "../services/registered.js";
import { generateAndStoreOTP,otpStore, getOtpStore,saveOtpStoreToFile ,loadOtpStoreFromFile} from "../services/otpStore.js";
import mongoose from "mongoose";

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

    res.status(200).json({ message: 'User updated successfully' });
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



export const createPublicProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required." });
    }

    // Check if username is already taken by another user
    const usernameTaken = await user.findOne({ username });
    if (usernameTaken && usernameTaken._id.toString() !== req.user.id) {
      return res.status(400).json({ message: "Username is already taken." });
    }

    // Fetch the authenticated user by ID
    const existingUser = await user.findById(req.user.id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // If already has a different username, block update
    if (existingUser.username && existingUser.username !== username) {
      return res.status(403).json({ message: "You can only enable your own public profile." });
    }

    // Set username (if new) and enable public profile
    existingUser.username = username;
    existingUser.publicProfile = true;
    await existingUser.save();

    res.status(200).json({
      message: "Public profile enabled successfully",
    });
  } catch (error) {
    console.error("Error enabling public profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};



export const getOtherPublicProfile = async (req, res) => {
  try {
    const { username } = req.params; 

    const otherUser = await user.findOne({ username });

    if (!otherUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!otherUser.publicProfile) {
      return res.status(403).json({ message: "This user's profile is not public." });
    }

    // Only return public-safe fields
    const {  _id,name, bio, profilePicture, website,gstNumber, address, followers, followings, posts  } = otherUser;

    res.status(200).json({
       _id,
      username: otherUser.username,
      name,
      bio,
      profilePicture,
      website,
      followers,
      followings,
      address,
      gstNumber,
      posts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};


export const getOwnProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const existingUser = await user.findById(req.user.id).populate("plan");

    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(existingUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};


export const followUser = async (req, res) => {
  try {
    const { usernameToFollow } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!usernameToFollow) {
      return res.status(400).json({ message: "Username to follow is required." });
    }

    if (req.user.username === usernameToFollow) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    // Fetch the user to follow
    const userToFollow = await user.findOne({ username: usernameToFollow });
    if (!userToFollow) {
      return res.status(404).json({ message: "User to follow not found." });
    }

    // Fetch the current user safely
    const currentUser = await user.findById(req.user._id || req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found." });
    }

    // Already following?
    if (currentUser.followings.includes(userToFollow._id)) {
      return res.status(400).json({ message: "You are already following this user." });
    }

    currentUser.followings.push(userToFollow._id);
    userToFollow.followers.push(currentUser._id);

    await currentUser.save();
    await userToFollow.save();

    res.status(200).json({ message: `You are now following ${usernameToFollow}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};


export const unfollowUser = async (req, res) => {
  try {
    const { usernameToUnfollow } = req.body; 

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!usernameToUnfollow) {
      return res.status(400).json({ message: "Username to unfollow is required." });
    }

    if (req.user.username === usernameToUnfollow) {
      return res.status(400).json({ message: "You cannot unfollow yourself." });
    }

    const userToUnfollow = await user.findOne({ username: usernameToUnfollow });
    if (!userToUnfollow) {
      return res.status(404).json({ message: "User to unfollow not found." });
    }

    const currentUser = await user.findById(req.user._id || req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found." });
    }

    if (!currentUser.followings.includes(userToUnfollow._id)) {
      return res.status(400).json({ message: "You are not following this user." });
    }

    currentUser.followings = currentUser.followings.filter(
      id => id.toString() !== userToUnfollow._id.toString()
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== currentUser._id.toString()
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.status(200).json({ message: `You have unfollowed ${usernameToUnfollow}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};



export const getFollowers = async (req, res) => {
  try {
    const { username } = req.params; // username of the profile to fetch followers for

    const targetUser = await user.findOne({ username }).populate(
      "followers",
      "username name profilePicture"
    );

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ followers: targetUser.followers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};


export const getFollowings = async (req, res) => {
  try {
    const { username } = req.params; // username of the profile to fetch followings for

    const targetUser = await user.findOne({ username }).populate(
      "followings",
      "username name profilePicture"
    );

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ followings: targetUser.followings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};


export const editPublicProfile = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const { bio, username, website, gstNumber } = req.body;

    // Fetch the user from DB
    const existingUser = await user.findById(req.user.id);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update fields if provided
    if (bio !== undefined) existingUser.bio = bio;
    if (username !== undefined) existingUser.username = username;
    if (website !== undefined) existingUser.website = website;
    if (gstNumber !== undefined) existingUser.gstNumber = gstNumber;

    // Save changes
    const updatedUser = await existingUser.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        username: updatedUser.username,
        bio: updatedUser.bio,
        website: updatedUser.website,
        gstNumber: updatedUser.gstNumber,
      },
    });
  } catch (error) {
    console.error(error);
    // Handle duplicate username error
    if (error.code === 11000 && error.keyValue.username) {
      return res.status(400).json({ message: "Username already exists." });
    }
    res.status(500).json({ message: "Server error." });
  }
};


export const createPost = async (req, res) => {
  try {
    const { caption, image } = req.body;
    const userId = req.user.id; 

    if (!caption && !image) {
      return res.status(400).json({ message: "Post must have at least caption or image." });
    }

    // Create new post object
    const newPost = {
      caption: caption || "",
      image: image || "",
      createdAt: new Date(),
    };

    // Push into user's posts array
    const updatedUser = await user.findByIdAndUpdate(
      userId,
      { $push: { posts: newPost } },
      { new: true, select: "posts" } 
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(201).json({
      message: "Post created successfully.",
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params; 

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    // Remove the post from user's posts array
    const updatedUser = await user.findByIdAndUpdate(
      userId,
      { $pull: { posts: { _id: postId } } },
      { new: true, select: "posts" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Post deleted successfully.",
      posts: updatedUser.posts, // optional, return remaining posts
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const feed = async (req, res) => {
  try {
    // page from query params (default = 1)
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const posts = await user.aggregate([
      { $unwind: "$posts" },
      { $sort: { "posts.createdAt": -1 } }, 
      {
        $project: {
          _id: 0,
          postId: "$posts._id",
          image: "$posts.image",
          caption: "$posts.caption",
          createdAt: "$posts.createdAt",
          userId: "$_id",
          username: "$username",
          name: "$name",
          profilePicture: "$profilePicture"
        }
      },
      { $skip: skip },
      { $limit: limit }
    ]);

    res.status(200).json({
      page,
      limit,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const userSuggestions = async (req, res) => {
  try {
    const userId = req.user?.id;  

    const suggestions = await user.aggregate([
      // exclude own account
      { $match: { _id: { $ne: userId } } },

      // random 10 users
      { $sample: { size: 10 } },

      // project only required fields + counts
      {
        $project: {
          _id: 1,
          username: 1,
          name: 1,
          profilePicture: 1,
          bio: 1,

          followersCount: { $size: { $ifNull: ["$followers", []] } },
          followingsCount: { $size: { $ifNull: ["$followings", []] } },
          postsCount: { $size: { $ifNull: ["$posts", []] } },
        }
      }
    ]);

    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Error fetching user suggestions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const searchUser = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "Username query is required" });
    }

    const users = await user.find(
      { username: { $regex: username, $options: "i" } }, 
      { _id: 1, username: 1, name: 1, profilePicture: 1, bio: 1 } 
    ).limit(20); 
    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};