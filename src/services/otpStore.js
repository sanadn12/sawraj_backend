import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory path using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure that the file path is absolute, so it always points to the correct location
const otpStoreFile =  path.resolve('otpStore.json'); // Correctly reference the file in the root

// Load OTPs from the file (if it exists), only once at startup
let otpStore = {};
export const loadOtpStoreFromFile = () => {
  if (fs.existsSync(otpStoreFile)) {
    try {
      otpStore = JSON.parse(fs.readFileSync(otpStoreFile, 'utf8'));
    } catch (error) {
      console.error('Error reading OTP store from file:', error);
    }
  }
};

// Persist OTP data to a file
export const saveOtpStoreToFile = () => {
  try {
    fs.writeFileSync(otpStoreFile, JSON.stringify(otpStore), 'utf8');
  } catch (error) {
    console.error('Error saving OTP store to file:', error);
  }
};

// Function to generate OTP and store it in otpStore
export const generateAndStoreOTP = (email, otp) => {
  const expiresAt = Date.now() + 15 * 60 * 1000; // OTP expires in 15 minutes
  otpStore[email] = { otp, expiresAt };

  // Save the OTP store to a file after every update
  saveOtpStoreToFile();
};

// Function to retrieve OTP data from otpStore
export const getOtpStore = () => otpStore;

// Export otpStore for use in other files
export { otpStore };

// Call the load function once when the server starts to ensure OTP data is available
loadOtpStoreFromFile();
