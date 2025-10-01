import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import http from "http";
import connectDB from './db/db.js';
import userRouter from '../src/routes/userRoutes.js';
import listingRouter from '../src/routes/listingRoutes.js';
import plansRouter from '../src/routes/planRoutes.js';
import messagingRouter from '../src/routes/messagingRoutes.js';
import authenticateJWT from '../src/middlewares/jwtauth.js';
import user from './models/userModel.js';
import listing from './models/listingModel.js';
import cron from 'node-cron';
import { globalLimiter } from './middlewares/rateLimiter.js';
import helmet from 'helmet';
import { sendMail } from './services/mailer.js';
import { initSocket } from "../src/socket/socket.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  'https://sawraj.in',
  'https://www.sawraj.in',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));


app.use(express.json({ limit: "10mb" }));
// app.get('/test-email', async (req, res) => {
//   try {
//     await sendMail(
//       "ni.sanad1433@gmail.com",
//       "Test Email from Sawraj Backend",
//       "<h1>Hello!</h1><p>If you see this, SMTP works on Render.</p>"
//     );
//     res.status(200).json({ message: "Email sent successfully" });
//   } catch (err) {
//     console.error("Test email failed:", err);
//     res.status(500).json({
//       error: err.message,
//       code: err.code,
//       command: err.command,
//       stack: err.stack
//     });
//   }
// });

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(helmet());

app.use(globalLimiter);


app.get("/health", (req, res) => {
  res.status(200).send("OK");
});


app.use('/api/users', userRouter);




app.use('/api/listing', listingRouter);

app.use('/api/plans', plansRouter);

app.use('/api/messaging', messagingRouter);


app.use(authenticateJWT); 

app.use((req, res, next) => {
  next();
});

app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});


const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 7860;

connectDB()
  .then(() => {
    // Schedule cron job to run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      const expirationTime = 10 * 60 * 1000; 
      const cutoffDate = new Date(Date.now() - expirationTime);

      try {
        const result = await user.deleteMany({
          verified: false,
          createdAt: { $lt: cutoffDate }
        });

        if (result.deletedCount > 0) {
          // console.log(`Deleted ${result.deletedCount} unverified users older than 10 minutes.`);
        } else {
          // console.log("No unverified users to delete at this time.");
        }
      } catch (error) {
        console.error("Cron Job Error: Failed to clean up unverified users", error);
      }
    });


    cron.schedule('0 0 1 * *', async () => {
  try {
    const result = await user.updateMany({}, { listingsCreatedThisMonth: 0 });
    // console.log(`Monthly listings reset for ${result.modifiedCount} users.`);
  } catch (error) {
    console.error("Cron Job Error: Failed to reset monthly listings", error);
  }
});


cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    const expiredUsers = await user.find({
      subscriptionValidTill: { $lte: now },
      plan: { $ne: null } 
    });

    if (expiredUsers.length === 0) {
      // console.log("No expired subscriptions at this time.");
      return;
    }

    for (const u of expiredUsers) {
      u.plan = null; 
      u.subscriptionValidTill = null;
      await u.save();
      // console.log(`User ${u.email} subscription expired and plan cleared.`);
    }
  } catch (error) {
    console.error("Cron Job Error: Failed to clear expired subscriptions", error);
  }
});


cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    // Find auctions that ended but are still active
    const endedAuctions = await listing.find({
      listingType: 'Auction',
      status: 'Active',
      auctionEndTime: { $lte: now }
    }).populate('highestBidder');

    for (const auction of endedAuctions) {
      // Mark auction as completed
      auction.status = 'Completed';
      await auction.save();

      if (auction.highestBidder) {
        const winner = auction.highestBidder;

        const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 680px; margin: auto; border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.08); overflow: hidden;">
  
  <!-- Logo -->
  <div style="background: #fff; text-align: center; padding: 28px 20px; border-bottom: 1px solid #f3f4f6;">
    <img src="https://sawraj.in/SeLogo.png" alt="Sawraj Enterprises Logo" style="width: 160px; display: block; margin: auto;" />
  </div>
  
  <!-- Header -->
  <div style="background: #ef4444; padding: 28px; text-align: center;">
    <h2 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
      Auction Won
    </h2>
  </div>
  
  <!-- Body -->
  <div style="padding: 32px; text-align: left; line-height: 1.7; font-size: 15px;">
    
    <p style="font-size: 16px; margin-bottom: 14px;">Hello <b>${winner.name}</b>,</p>
    
    <p style="margin-bottom: 16px;">
      Congratulations! You have successfully won the auction for 
      <b style="color:#ef4444;">${auction.name}</b> with a winning bid of 
      <b>₹${auction.highestBid}</b>.
    </p>
    
    <div style="background: #f9f9f9; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #222;">
        To complete your purchase, please reply to this email with the following details:
      </p>
      <ol style="margin: 12px 0 0 18px; padding: 0; color: #444; font-size: 15px;">
        <li>Government ID (Aadhar & PAN) for verification.</li>
        <li>Payment screenshot via UPI or Bank Transfer.</li>
      </ol>
    </div>
    
    <p style="margin-bottom: 16px;">
      <b>UPI ID:</b> ni.sanad1433-1@okaxis <br>
      <span style="display:block; text-align:center; margin:10px 0; font-weight:600; color:#666;">OR</span>
      <b>Account Holder Name:</b> Naqvi Sayed Sanad Tariqulhaq <br>
      <b>Account Number:</b> 1247337874 <br>
      <b>IFSC Code:</b> KKBK001367
    </p>
    
    <p style="margin-bottom: 18px; font-size: 15px;">
      Please respond within <b>24 hours</b>. Once your details are verified, the seller will be contacted to finalize the transaction.
    </p>
    
    <!-- CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://sawraj.in/profile" target="_blank" style="background: #ef4444; color: #fff; text-decoration: none; font-size: 16px; padding: 14px 32px; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 10px rgba(239,68,68,0.25);">
        Go to Dashboard
      </a>
    </div>
    
    <p style="margin-bottom: 0; font-size: 15px;">
      For any assistance, please contact us at 
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

        // Send email to winner
        await sendMail(winner.email, `You Won the Auction - ${auction.name}`, emailHtml);

      }
    }
  } catch (err) {
    console.error('Auction cron job error:', err);
  }
});


    server.listen(PORT, () => {
      console.log(`App is listening at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

export default app;
