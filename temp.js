// import mongoose from "mongoose";

// const paymentSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
//   plan: { type: mongoose.Schema.Types.ObjectId, ref: "plan", required: true },
//   razorpayOrderId: { type: String, required: true },
//   razorpayPaymentId: { type: String},
//   amount: { type: Number, required: true },
//   status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
//   createdAt: { type: Date, default: Date.now },
// });

// const Payment = mongoose.model("payment", paymentSchema);
// export default Payment;


// import Razorpay from "razorpay";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_SECRET,
// });


// export const buyPlan = async (req, res) => {
//   try {
//     if (!req.user) return res.status(401).json({ message: "Unauthorized." });

//     const { planId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

//     if (!planId) return res.status(400).json({ message: "Plan ID is required." });

//     const selectedPlan = await plan.findById(planId);
//     if (!selectedPlan) return res.status(404).json({ message: "Plan not found." });

//     const existingUser = await user.findById(req.user.id);

//     if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
//       const options = {
//         amount: selectedPlan.price * 100, // amount in paise
//         currency: "INR",
//         receipt: `receipt_${new Date().getTime()}`,
//       };
//       const order = await razorpay.orders.create(options);

//       await Payment.create({
//         user: existingUser.id,
//         plan: selectedPlan.id,
//         razorpayOrderId: order.id,
//         amount: selectedPlan.price,
//         status: "pending",
//       });

//       return res.json({ order });
//     }

//     const generatedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_SECRET)
//       .update(razorpayOrderId + "|" + razorpayPaymentId)
//       .digest("hex");

//     if (generatedSignature !== razorpaySignature)
//       return res.status(400).json({ message: "Payment verification failed." });

//     await Payment.findOneAndUpdate(
//       { razorpayOrderId },
//       { razorpayPaymentId, status: "success" }
//     );

//     existingUser.plan = selectedPlan._id;
//     existingUser.subscriptionValidTill = new Date(new Date().setMonth(new Date().getMonth() + 1));
//     existingUser.listingsCreatedThisMonth = 0;
//     await existingUser.save();

//      await sendMail(
//       existingUser.email,
//       `Plan Purchase Successful - ${selectedPlan.name}`,
//       `
//         <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 650px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.08); overflow: hidden;">
    
//     <!-- Logo Section -->
//     <div style="background: #fff; text-align: center; padding: 30px 20px; border-bottom: 1px solid #f1f1f1;">
//       <img src="https://sawraj.in/SeLogo.png" alt="Sawraj Enterprises Logo" style="width: 180px; display: block; margin: auto;" />
//     </div>

//     <!-- Header Bar -->
//     <div style="background: #ef4444; padding: 20px; text-align: center;">
//       <h2 style="color: #fff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.4px;">
//         Plan Purchase Confirmation
//       </h2>
//     </div>

//     <!-- Body -->
//     <div style="padding: 30px; text-align: left; line-height: 1.6;">
//       <p style="font-size: 16px; margin-bottom: 12px;">Hello <b>${existingUser.name}</b>,</p>

//       <p style="font-size: 16px; margin-bottom: 15px;">
//         Thank you for purchasing the <b style="color:#ef4444;">${selectedPlan.name}</b> plan .
//       </p>

//       <p style="font-size: 16px; margin-bottom: 15px;">
//         Your subscription is now <b style="color:#16a34a;">active</b> and valid till  
//         <b>${existingUser.subscriptionValidTill.toDateString()}</b>.
//       </p>

//       <!-- Call-to-Action -->
//       <div style="text-align: center; margin: 35px 0;">
//         <a href="https://sawraj.in/profile" target="_blank" style="background: #ef4444; color: #fff; text-decoration: none; font-size: 16px; padding: 14px 28px; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(22,163,74,0.25); transition: background 0.3s;">
//           Go to Dashboard
//         </a>
//       </div>

//       <p style="font-size: 16px; margin-bottom: 0;">
//         For any questions or assistance, please contact our support team at  
//         <a href="mailto:sawrajenterprises2003@gmail.com" style="color: #ef4444; text-decoration: none; font-weight: 600;">sawrajenterprises2003@gmail.com</a>.
//       </p>
//     </div>

//     <!-- Footer -->
//     <div style="text-align: center; border-top: 1px solid #eee; padding: 18px; margin-top: 20px; color: #777; font-size: 13px; background: #fafafa;">
//       <p style="margin: 0;">Best regards,</p>
//       <p style="margin: 0;">The Sawraj Enterprises Team</p>
//     </div>
//   </div>
//       `
//     );
    
//     res.status(200).json({
//       message: `Plan "${selectedPlan.name}" purchased successfully.`,
//       plan: selectedPlan,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error." });
//   }
// };


