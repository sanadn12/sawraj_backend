import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

const listingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: String,
    quantity: String,
    price: Number, 
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    details: String,
    status: { type: String, default: "active" },
    createdAt: { type: Date, default: Date.now },
    address: String,
    images: [{ type: String }],
    listingType: { type: String, enum: ["Auction", "Sale"], default: "Sale" },

    // Auction fields
    auctionStartTime: { type: Date }, 
    auctionEndTime: { type: Date }, 
    bids: [bidSchema],
    highestBid: { type: Number, default: 0 },
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "user" },

    comments: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
            content: String,
            createdAt: { type: Date, default: Date.now }
        }
    ]

}, { timestamps: true });

const Listing = mongoose.model("listing", listingSchema);
export default Listing;
