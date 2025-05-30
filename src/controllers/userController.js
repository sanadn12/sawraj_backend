import user from "../models/userModel.js";
import bcrypt from "bcrypt";
import  jwt from "jsonwebtoken";
import { generateAndSendOTP } from "../services/otpGenerator.js";
import { sendWelcomeEmail } from "../services/registered.js";
import { generateAndStoreOTP,otpStore, getOtpStore,saveOtpStoreToFile ,loadOtpStoreFromFile} from "../services/otpStore.js";
import { google } from 'googleapis';
import multer from 'multer';
import path from 'path';
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
      { id: User.id, email: User.email },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    res.status(200).json({ message: 'Login successful', token, user: { 
    _id: User._id, 
    email: User.email, 
    name: User.name 
  }  });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
  

export const getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const foundUser = await user.findById(id).select("-password");

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
  const { id } = req.params;  // user ID from URL
  const { name, address } = req.body;  // data to update

  if (!name || !address) {
    return res.status(400).json({ error: 'Name and address are required' });
  }

  try {
    const updatedUser = await user.findByIdAndUpdate(
      id,
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







const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Google Drive auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

export const editProfilePic = async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const existingUser = await user.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare metadata for Google Drive upload
    const fileMetadata = {
      name: req.file.originalname,
      parents: ['1mQF1TYqTj2I2Kg8d3__hhl-juxbOdHmH'], //  folder 
    };

    // Prepare media stream for Google Drive upload
    const media = {
      mimeType: req.file.mimetype,
      body: Readable.from(req.file.buffer),  // Convert buffer to stream
    };

    // Upload the file to Google Drive
    const uploadResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    const newFileId = uploadResponse.data.id;
    const newDirectLink = `https://drive.google.com/uc?export=view&id=${newFileId}`;

    // Delete old file from Google Drive if exists
    if (existingUser.profilePicture) {
      const oldFileIdMatch = existingUser.profilePicture.match(/id=(.*)/);
      if (oldFileIdMatch && oldFileIdMatch[1]) {
        await drive.files.delete({ fileId: oldFileIdMatch[1] });
      }
    }

    // Update user profile picture URL in DB
    existingUser.profilePicture = newDirectLink;
    const updatedUser = await existingUser.save();

    res.status(200).json({
      message: 'Profile picture updated successfully!',
     _id: updatedUser._id,
    profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Export route
export const editProfilePicRoute = [upload.single('profilePicture'), editProfilePic];

