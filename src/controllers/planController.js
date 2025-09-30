import { sendMail } from '../services/mailer.js';
import listing from '../models/listingModel.js';
import user from "../models/userModel.js";
import plan from "../models/planModel.js";
import Payment from '../models/paymentModel.js';
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from 'dotenv';
import axios from "axios";

dotenv.config();
   
export const createPlan = async (req, res) => {
  try {
   if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You do not have permission to access this resource." });
    }

    const { name, price, listingLimit, auctionAccess, features } = req.body;

    // Basic validation
    if (!name) {
      return res.status(400).json({ message: "Plan name is required." });
    }

    // Create new plan
    const newPlan = new plan({
      name,
      price: price || 0,
      listingLimit: listingLimit || 1,
      auctionAccess: auctionAccess || false,
      features: features || [],
    });

    const savedPlan = await newPlan.save();

    res.status(201).json({
      message: "Plan created successfully",
      plan: savedPlan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getPublicPlans = async (req, res) => {
  try {
    const plans = await plan.find({}, "name price listingLimit features auctionAccess"); 
    res.status(200).json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getUserPlans = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: You do not have permission to access this resource." });
    }

    const plans = await plan.find();
    const planCount = await plan.countDocuments();

    res.status(200).json({
      count: planCount,
      plans,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};




export const editPlan = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only." });
    }

    const { id } = req.params;
    const { name, price, listingLimit, auctionAccess, features } = req.body;

    // Find plan by ID
    const existingPlan = await plan.findById(id);
    if (!existingPlan) {
      return res.status(404).json({ message: "Plan not found." });
    }

    // Update fields if provided
    if (name !== undefined) existingPlan.name = name;
    if (price !== undefined) existingPlan.price = price;
    if (listingLimit !== undefined) existingPlan.listingLimit = listingLimit;
    if (auctionAccess !== undefined) existingPlan.auctionAccess = auctionAccess;
    if (features !== undefined) existingPlan.features = features;

    const updatedPlan = await existingPlan.save();

    res.status(200).json({
      message: "Plan updated successfully",
      plan: updatedPlan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const deletePlan = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only." });
    }

    const { id } = req.params; 

    const deletedPlan = await plan.findByIdAndDelete(id);

    if (!deletedPlan) {
      return res.status(404).json({ message: "Plan not found." });
    }

    res.status(200).json({ message: "Plan deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};


const CASHFREE_CONFIG = {
  appId: process.env.CASHFREE_APP_ID,
  secretKey: process.env.CASHFREE_SECRET_KEY,
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.cashfree.com/pg' 
    : 'https://sandbox.cashfree.com/pg'
};

// Generate signature for Cashfree
const generateCashfreeSignature = (orderId, amount) => {
  const data = `${orderId}${amount}${CASHFREE_CONFIG.secretKey}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Verify webhook signature
const verifyCashfreeSignature = (orderId, orderAmount, signature) => {
  const generatedSignature = generateCashfreeSignature(orderId, orderAmount);
  return generatedSignature === signature;
};

export const buyPlan = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized." });

    const { planId } = req.body;

    if (!planId) return res.status(400).json({ message: "Plan ID is required." });

    const selectedPlan = await plan.findById(planId);
    if (!selectedPlan) return res.status(404).json({ message: "Plan not found." });

    const existingUser = await user.findById(req.user.id);

    // Create Cashfree order
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const orderData = {
      order_id: orderId,
      order_amount: selectedPlan.price,
      order_currency: "INR",
      order_note: `Plan: ${selectedPlan.name}`,
      customer_details: {
        customer_id: existingUser._id.toString(),
        customer_email: existingUser.email,
        customer_phone: existingUser.phone || "9999999999",
        customer_name: existingUser.name
      },
      order_meta: {
        return_url: `${frontendUrl}/payment-callback?order_id={order_id}`
      }
    };


    const response = await axios.post(
      `${CASHFREE_CONFIG.baseUrl}/orders`,
      orderData,
      {
        headers: {
          'x-client-id': CASHFREE_CONFIG.appId,
          'x-client-secret': CASHFREE_CONFIG.secretKey,
          'x-api-version': '2022-09-01',
          'Content-Type': 'application/json'
        }
      }
    );

    // Create payment record
    await Payment.create({
      user: existingUser.id,
      plan: selectedPlan.id,
      cashfreeOrderId: orderId,
      amount: selectedPlan.price,
      status: "pending"
    });

    return res.json({
      order: response.data,
      signature: generateCashfreeSignature(orderId, selectedPlan.price)
    });

  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: "Order ID is required" 
      });
    }

    // Check payment in database first
    const payment = await Payment.findOne({ cashfreeOrderId: orderId })
      .populate('plan')
      .populate('user');

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: "Payment not found" 
      });
    }

    // If already successful, return immediately
    if (payment.status === "success") {
      return res.json({
        success: true,
        payment: {
          status: payment.status,
          orderId: payment.cashfreeOrderId,
          amount: payment.amount,
          plan: payment.plan
        }
      });
    }

    // Check with Cashfree API for latest status
    try {
      const paymentStatusResponse = await axios.get(
        `${CASHFREE_CONFIG.baseUrl}/orders/${orderId}/payments`,
        {
          headers: {
            'x-client-id': CASHFREE_CONFIG.appId,
            'x-client-secret': CASHFREE_CONFIG.secretKey,
            'x-api-version': '2022-09-01'
          }
        }
      );

      const paymentDetails = paymentStatusResponse.data;
      const successfulPayment = paymentDetails.find(payment => 
        payment.payment_status === "SUCCESS"
      );

      if (successfulPayment && payment.status === "pending") {
        // Update payment status
        payment.status = "success";
        payment.cashfreePaymentId = successfulPayment.cf_payment_id;
        await payment.save();


    const subscriptionValidTill = new Date();
    subscriptionValidTill.setMonth(subscriptionValidTill.getMonth() + 1);
        // Update user plan
        await user.findByIdAndUpdate(payment.user, {
          plan: payment.plan,
        subscriptionValidTill,
          listingsCreatedThisMonth: 0
        });
const userObj = payment.user;  
const planObj = payment.plan; 

        // Send confirmation email
        try {
        await sendMail(
        userObj.email,
        `Plan Purchase Successful - ${planObj.name}`,
        `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 650px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.08); overflow: hidden;">
      
      <!-- Logo Section -->
      <div style="background: #fff; text-align: center; padding: 30px 20px; border-bottom: 1px solid #f1f1f1;">
        <img src="https://sawraj.in/SeLogo.png" alt="Sawraj Enterprises Logo" style="width: 180px; display: block; margin: auto;" />
      </div>

      <!-- Header Bar -->
      <div style="background: #ef4444; padding: 20px; text-align: center;">
        <h2 style="color: #fff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.4px;">
          Plan Purchase Confirmation
        </h2>
      </div>

      <!-- Body -->
      <div style="padding: 30px; text-align: left; line-height: 1.6;">
        <p style="font-size: 16px; margin-bottom: 12px;">Hello <b>${userObj.name}</b>,</p>

        <p style="font-size: 16px; margin-bottom: 15px;">
          Thank you for purchasing the <b style="color:#ef4444;">${planObj.name}</b> plan.
        </p>

        <p style="font-size: 16px; margin-bottom: 15px;">
          Your subscription is now <b style="color:#16a34a;">active</b> and valid till  
          <b>${subscriptionValidTill.toDateString()}</b>.
        </p>

        <!-- Call-to-Action -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://sawraj.in/profile" target="_blank" style="background: #ef4444; color: #fff; text-decoration: none; font-size: 16px; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(22,163,74,0.25); transition: background 0.3s;">
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
        `
      );
      } catch (mailError) {
  console.error("Failed to send email:", mailError);
}

        return res.json({
          success: true,
          payment: {
            status: "success",
            orderId: payment.cashfreeOrderId,
            amount: payment.amount,
            plan: planObj
          }
        });
      }
    } catch (apiError) {
      console.log("Cashfree API check failed, using database status");
    }

    // Return current status
    return res.json({
      success: payment.status === "success",
      payment: {
        status: payment.status,
        orderId: payment.cashfreeOrderId,
        amount: payment.amount,
        plan: payment.plan
      }
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Payment verification failed" 
    });
  }
};



export const cashfreeWebhook = async (req, res) => {
  try {
    const { 
      orderId, 
      orderAmount, 
      referenceId, 
      txStatus, 
      paymentMode, 
      txMsg, 
      txTime,
      signature 
    } = req.body;

    // Verify webhook signature
    const generatedSignature = generateCashfreeSignature(orderId, orderAmount);
    if (generatedSignature !== signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    if (txStatus === "SUCCESS") {
      const payment = await Payment.findOne({ cashfreeOrderId: orderId });
     if (payment && payment.status === "pending") {
  payment.status = "success";
  payment.cashfreePaymentId = referenceId;
  await payment.save();

  const subscriptionValidTill = new Date();
  subscriptionValidTill.setMonth(subscriptionValidTill.getMonth() + 1);

  await user.findByIdAndUpdate(payment.user, {
    plan: payment.plan,
    subscriptionValidTill,
    listingsCreatedThisMonth: 0
  });

  const userObj = payment.user;
  const planObj = payment.plan;
 try {
      await sendMail(
        userObj.email,
        `Plan Purchase Successful - ${planObj.name}`,
        `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 650px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.08); overflow: hidden;">
      
      <!-- Logo Section -->
      <div style="background: #fff; text-align: center; padding: 30px 20px; border-bottom: 1px solid #f1f1f1;">
        <img src="https://sawraj.in/SeLogo.png" alt="Sawraj Enterprises Logo" style="width: 180px; display: block; margin: auto;" />
      </div>

      <!-- Header Bar -->
      <div style="background: #ef4444; padding: 20px; text-align: center;">
        <h2 style="color: #fff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.4px;">
          Plan Purchase Confirmation
        </h2>
      </div>

      <!-- Body -->
      <div style="padding: 30px; text-align: left; line-height: 1.6;">
        <p style="font-size: 16px; margin-bottom: 12px;">Hello <b>${userObj.name}</b>,</p>

        <p style="font-size: 16px; margin-bottom: 15px;">
          Thank you for purchasing the <b style="color:#ef4444;">${planObj.name}</b> plan.
        </p>

        <p style="font-size: 16px; margin-bottom: 15px;">
          Your subscription is now <b style="color:#16a34a;">active</b> and valid till  
          <b>${subscriptionValidTill.toDateString()}</b>.
        </p>

        <!-- Call-to-Action -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://sawraj.in/profile" target="_blank" style="background: #ef4444; color: #fff; text-decoration: none; font-size: 16px; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(22,163,74,0.25); transition: background 0.3s;">
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
        `
      );
  } catch (mailError) {
    console.error("Failed to send webhook confirmation email:", mailError);
  }
      }
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};

export const getMyPlan = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const foundUser = await user.findById(userId).populate("plan");
    if (!foundUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Default free plan if user has no plan
    if (!foundUser.plan) {
      return res.status(200).json({
        plan: {
          _id: "free",
          name: "Sawraj Basics",
          price: 0,
          listingLimit: 2,
          features: ["Basic Access"],
          auctionAccess: false,
        },
        subscriptionValidTill: null,
        listingsCreatedThisMonth: foundUser.listingsCreatedThisMonth || 0,
      });
    }

    return res.status(200).json({
      plan: foundUser.plan,
      subscriptionValidTill: foundUser.subscriptionValidTill,
      listingsCreatedThisMonth: foundUser.listingsCreatedThisMonth,
    });
  } catch (error) {
    console.error("Error in getMyPlan:", error);
    return res.status(500).json({ error: "Server error" });
  }
};