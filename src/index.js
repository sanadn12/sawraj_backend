import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import connectDB from './db/db.js';
import userRouter from '../src/routes/userRoutes.js';
import listingRouter from '../src/routes/listingRoutes.js';
import authenticateJWT from '../src/middlewares/jwtauth.js';
import user from './models/userModel.js';
import cron from 'node-cron';

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(bodyParser.json());

app.use('/api/users', userRouter);




app.use('/api/listing', listingRouter);
app.use(authenticateJWT); 

app.use((req, res, next) => {
  next();
});

app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 7860;

connectDB()
  .then(() => {
    // Schedule cron job to run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      const expirationTime = 10 * 60 * 1000; // 10 minutes in ms
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



    app.listen(PORT, () => {
      console.log(`App is listening at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

export default app;
