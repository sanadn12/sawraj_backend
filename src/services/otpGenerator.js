import Brevo from "@getbrevo/brevo";
import { otpStore } from "./otpStore.js";  

// Setup Brevo client
const client = new Brevo.TransactionalEmailsApi();
client.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export const generateAndSendOTP = async (email, name, length = 6) => {
  const digits = "0123456789";
  let otp = "";

  // Generate OTP
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  // Store OTP in memory with expiration (15 minutes)
  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };

  // Build email content
  const htmlContent = `
  <div style="font-family: Arial, sans-serif; color: #333; max-width: 650px; margin: auto; border: 1px solid #e5e7eb; padding: 0; border-radius: 12px; background: #fff; box-shadow: 0 6px 18px rgba(0,0,0,0.1); overflow: hidden;">
    
    <!-- Logo Section -->
    <div style="background: #fff; text-align: center; padding: 25px 20px; border-bottom: 1px solid #f1f1f1;">
      <img src="https://sawraj.in/SeLogo.png" alt="Sawraj Enterprises Logo" style="width: 180px; display: block; margin: auto;" />
    </div>

    <!-- Header Bar -->
    <div style="background: #ef4444; padding: 18px; text-align: center;">
      <h2 style="color: #fff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">Welcome to Sawraj Enterprises!</h2>
    </div>

    <!-- Body -->
    <div style="padding: 25px; text-align: left;">
      <p style="font-size: 16px; margin-bottom: 12px;">Hello <b>${name}</b>,</p>

      <p style="font-size: 16px; margin-bottom: 20px;">
        We're excited to have you on board. To complete your registration, please use the One-Time Password (OTP) below.
      </p>

      <!-- OTP Card -->
      <div style="background: linear-gradient(135deg, #fee2e2, #fff); border: 2px dashed #ef4444; padding: 30px; text-align: center; border-radius: 10px; margin: 25px 0;">
        <h3 style="font-size: 20px; margin: 0; color: #991b1b; font-weight: 600;">Your OTP Code</h3>
        <p style="font-size: 36px; font-weight: bold; color: #ef4444; margin: 12px 0;">${otp}</p>
        <p style="font-size: 14px; color: #555; margin: 0;">(Valid for 15 minutes)</p>
      </div>

      <p style="font-size: 16px; margin-bottom: 20px;">
        Enter this OTP on the verification page to activate your account.
      </p>

      <p style="font-size: 16px;">
        Didn’t request this? Please ignore this email or contact support at  
        <a href="mailto:sawrajenterprises2003@gmail.com" style="color: #ef4444; text-decoration: none; font-weight: 600;">sawrajenterprises2003@gmail.com</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #eee; padding: 15px; margin-top: 20px; color: #999; font-size: 13px; background: #fafafa;">
      <p style="margin: 0;">Best regards,</p>
      <p style="margin: 0;">Sawraj Enterprises</p>
    </div>
  </div>
  `;

  try {
    await client.sendTransacEmail({
      sender: { email: process.env.EMAIL_USER, name: "Sawraj Enterprises" },
      to: [{ email }],
      subject: "Your OTP Code - Welcome to Sawraj Enterprises!",
      htmlContent,
    });

    console.log("OTP email sent via Brevo API");
  } catch (err) {
    console.error("Brevo OTP email error:", err.response?.body || err);
  }

  return otp;
};
