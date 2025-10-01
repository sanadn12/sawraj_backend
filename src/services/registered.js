import Brevo from "@getbrevo/brevo";

// Setup Brevo client once
const client = new Brevo.TransactionalEmailsApi();
client.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Function to send welcome email after account verification
export const sendWelcomeEmail = async (email, name) => {
  try {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 650px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.08); overflow: hidden;">
  
        <!-- Logo Section -->
        <div style="background: #fff; text-align: center; padding: 30px 20px; border-bottom: 1px solid #f1f1f1;">
          <img src="https://sawraj.in/SeLogo.png" alt="Sawraj Enterprises Logo" style="width: 180px; display: block; margin: auto;" />
        </div>

        <!-- Header Bar -->
        <div style="background: #ef4444; padding: 20px; text-align: center;">
          <h2 style="color: #fff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.4px;">
            Welcome to Sawraj Enterprises
          </h2>
        </div>

        <!-- Body -->
        <div style="padding: 30px; text-align: left; line-height: 1.6;">
          <p style="font-size: 16px; margin-bottom: 12px;">Hello <b>${name}</b>,</p>

          <p style="font-size: 16px; margin-bottom: 15px;">
            Your account has been <b style="color:#16a34a;">successfully verified and activated</b>.
          </p>

          <p style="font-size: 16px; margin-bottom: 15px;">
            You can now explore our services and manage your account with full access.  
            We’re committed to providing you with a seamless and secure experience.
          </p>

          <!-- Call-to-Action -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://sawraj.in/profile" target="_blank" style="background: #ef4444; color: #fff; text-decoration: none; font-size: 16px; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(239,68,68,0.25); transition: background 0.3s;">
              Go to Dashboard
            </a>
          </div>

          <p style="font-size: 16px; margin-bottom: 0;">
            For any questions or assistance, please contact our support team at  
            <a href="mailto:sawrajenterprises2003@gmail.com" style="color: #ef4444; text-decoration: none; font-weight: 600;">sawrajenterprises2003@gmail.com</a>.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #eee; padding: 18px; margin-top: 20px; color: #777; font-size: 13px; background: #fafafa;">
          <p style="margin: 0;">Best regards,</p>
          <p style="margin: 0;">The Sawraj Enterprises Team</p>
        </div>
      </div>
    `;

    await client.sendTransacEmail({
      sender: { email: process.env.EMAIL_USER, name: "Sawraj Enterprises" },
      to: [{ email }],
      subject: "Welcome to Sawraj Enterprises!",
      htmlContent,
    });

    console.log("Welcome email sent via Brevo API");
  } catch (error) {
    console.error("Error in sending welcome email:", error.response?.body || error);
  }
};
