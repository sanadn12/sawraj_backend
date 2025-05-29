import nodemailer from "nodemailer";
import { otpStore, getOtpStore,saveOtpStoreToFile } from './otpStore.js';  
// Function to generate OTP and send it via email
export const generateAndSendOTP = async (email,name, length = 6) => {
  const digits = '0123456789';
  let otp = '';

  // Generate OTP
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  // Store OTP in memory with expiration time (e.g., 15 minutes)
  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 15 * 60 * 1000, // OTP expires in 15 minutes
  };

  // Configure nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS, 
    },
  });

  // Mail options
  const mailOptions = {
    from: `"Sawraj Enterprises" <${process.env.EMAIL_USER}>`,
to: email,
subject: 'Your OTP Code - Welcome to Sawraj Enterprises!',
html: `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #4CAF50;">Welcome to Sawraj Enterprises!</h2>
    <p style="font-size: 16px;">Hello <b>${name}</b>,</p>
    <p style="font-size: 16px;">
      We're excited to have you on board! To complete your registration, please use the One-Time Password (OTP) below.
    </p>
    <h3 style="font-size: 24px; color: #FF5722;">Your OTP Code:</h3>
    <p style="font-size: 28px; font-weight: bold; color: #2196F3;">${otp}</p>
    <p style="font-size: 16px;">
      This OTP is valid for 15 minutes. Please enter it on the verification page to activate your account.
    </p>
    <p style="font-size: 16px;">
      If you did not request this, please ignore this email or contact support at <a href="mailto:sawrajenterprises2003@gmail.com">sawrajenterprises2003@gmail.com</a>.
    </p>
    <br>
    <p style="font-size: 14px; color: #999;">Best regards,</p>
    <p style="font-size: 14px; color: #999;">The Sawraj Enterprises Team</p>
  </div>
`

  };

  // Send email
  await transporter.sendMail(mailOptions);

  return otp;
};
