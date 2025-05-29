import nodemailer from "nodemailer";

// Function to send welcome email after account verification
export const sendWelcomeEmail = async (email, name) => {
  try {
    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // You can change this to any mail service you use
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    // Mail options
    const mailOptions = {
      from: `"Sawraj Enterprises" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Sawraj Enterprises!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #4CAF50;">Welcome to Sawraj Enterprises!</h2>
          <p style="font-size: 16px;">Hello <b>${name}</b>,</p>
          <p style="font-size: 16px;">
            Congratulations! Your account has been successfully verified and activated.
          </p>
          <p style="font-size: 16px;">
            We're thrilled to have you as a part of our community. You can now explore our services and manage your account.
          </p>
          <p style="font-size: 16px;">
            If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:sawrajenterprises2003@gmail.com">sawrajenterprises2003@gmail.com</a>.
          </p>
          <br>
          <p style="font-size: 14px; color: #999;">Best regards,</p>
          <p style="font-size: 14px; color: #999;">The Sawraj Enterprises Team</p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

  } catch (error) {
    console.error("Error in sending welcome email:", error);
  }
};
