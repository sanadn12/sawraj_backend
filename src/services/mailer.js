import nodemailer from "nodemailer";

export const sendMail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com", 
      port: 587,                    
      secure: false,              
      auth: {
        user: "984483001@smtp-brevo.com",  // Your SMTP login
        pass: process.env.SENDINBLUE_SMTP_PASS, 
      },
    });

    await transporter.sendMail({
      from: `"Sawraj Enterprises" <sawrajenterprises2003@gmail.com>`, // Verified sender
      to,
      subject,
      html,
    });

    console.log("Email sent successfully via Sendinblue!");
  } catch (error) {
    console.error("Error sending email via Sendinblue:", error);
  }
};
