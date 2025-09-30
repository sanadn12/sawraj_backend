    import mongoose from "mongoose";

    const planModel = new mongoose.Schema({
        
name: { type: String, required: true }, 
price: { type: Number, default: 0 }, 
listingLimit: { type: Number, default: 1 },
auctionAccess: { type: Boolean, default: false },
features: [{ type: String }],
}, { timestamps: true }
    );

    const plan = mongoose.model("plan", planModel);

    export default plan;
