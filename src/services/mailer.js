import Brevo from "@getbrevo/brevo";

const client = new Brevo.TransactionalEmailsApi();
client.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

export const sendMail = async (to, subject, html) => {
  try {
    await client.sendTransacEmail({
      sender: { email: process.env.EMAIL_USER, name: "Sawraj Enterprises" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
    console.log("Email sent with Brevo API");
  } catch (err) {
    console.error("Brevo API error:", err.response?.body || err);
  }
};
