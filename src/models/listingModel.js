    import mongoose from "mongoose";

    const listingModel = new mongoose.Schema({
        
        name: String,
        category:String,
        quantity:String,
        price:String,
        postedBy: { type: String, required: true },  
        details:String,
        status:String,
        createdAt: { type: Date, default: Date.now },
            address:String,
            images: [{ type: String }],
            listingType: { type: String, enum: ["Auction", "Sale"] },






    });

    const listing = mongoose.model("listing", listingModel);

    export default listing;
