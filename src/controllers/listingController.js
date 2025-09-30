import listing from '../models/listingModel.js';
import user from "../models/userModel.js";








export const addlisting = async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      details,
      status,
      address,
      price,
      listingType,
      images,
      auctionStartTime,
      auctionEndTime,
    } = req.body;

    // Get user from JWT (middleware must set req.user)
    const postedBy = req.user?.id;
    if (!postedBy) {
      return res.status(401).json({ error: "Unauthorized: No user found in token" });
    }
      const users = await user.findById(postedBy).populate("plan");
    let plan = users.plan;
    if (!plan) {
      plan = {
        listingLimit: 2,     
        auctionAccess: false, 
      };
    }

        if (listingType === "Auction" && users.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create auction listings." });
    }

    // Check subscription validity
    if (users.subscriptionValidTill && users.subscriptionValidTill < new Date()) {
      return res.status(400).json({ error: "Your subscription has expired." });
    }

    // Check monthly listing limit
    if (listingType !== "Auction" && users.listingsCreatedThisMonth >= plan.listingLimit) {
      return res.status(400).json({ error: "You have reached your monthly listing limit." });
    }

    // Check auction access
   if (listingType === "Auction" && !plan.auctionAccess && users.role !== "admin") {
      return res.status(400).json({ error: "Your plan does not allow auction listings." });
    }
    

    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (typeof img !== "string" || !img.startsWith("data:image")) {
          return res.status(400).json({ error: "Invalid image format" });
        }
      }
    }

     let auctionData = {};
    if (listingType === "Auction") {
      if (!auctionStartTime || !auctionEndTime) {
        return res.status(400).json({ error: "Auction start and end time are required." });
      }
      if (new Date(auctionStartTime) >= new Date(auctionEndTime)) {
        return res.status(400).json({ error: "Auction end time must be after start time." });
      }
      auctionData = {
        auctionStartTime: new Date(auctionStartTime),
        auctionEndTime: new Date(auctionEndTime),
        bids: [],
        highestBid: null, 
        highestBidder: null,
      };
    }


    const newListing = new listing({
      name,
      category,
      price,
      quantity,
      postedBy,
      details,
      status,
      address,
      images: images || [], 
      listingType,
            ...auctionData,

    });

    const savedListing = await newListing.save();
 if (listingType !== "Auction") {
      users.listingsCreatedThisMonth += 1;
      await users.save();
    }
    
    res.status(201).json({
      message: "Listing added successfully!"    });

  } catch (error) {
    console.error("Error adding listing:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};








export const getalllistings = async (req, res) => {
  try {
    const listings = await listing.find().lean(); 

    if (!listings || listings.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No listings found",
      });
    }

    // Populate user data for each listing
    const listingsWithUser = await Promise.all(
      listings.map(async (item) => {
         const {
          bids,
          highestBid,
          highestBidder,
          comments,
          ...cleanedListing
        } = item;

        let userData = null;
        if (item.postedBy) {
          try {
          const userDoc  = await user
              .findById(item.postedBy)
              .select("_id email name phone profilePicture address")
              .lean();
               if (userDoc) {
              userData = userDoc;
            }

          } catch (err) {
            console.warn(`Could not fetch user for listing ${item._id}:`, err);
          }
        }

       return {
          ...cleanedListing,
          user: userData || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: listingsWithUser,
    });

  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch listings",
      error: error.message,
    });
  }
};




export const getlisting = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch listing and convert to plain JS object
    const listingItem = await listing.findById(id).lean();
    if (!listingItem) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    let userData = null;
    if (listingItem.postedBy) {
      try {
     const userDoc  = await user
          .findById(listingItem.postedBy)
.select("_id email name phone profilePicture address")
          .lean();
                  if (userDoc) userData = userDoc;

      } catch (err) {
        console.warn(`Could not fetch user for listing ${id}:`, err);
      }
    }

     const {
      bids,
      highestBid,
      highestBidder,
      comments,
      ...cleanedListing
    } = listingItem;


      res.status(200).json({
      success: true,
      data: {
        ...cleanedListing,
        user: userData,
      },
    });

  } catch (error) {
    console.error("Error fetching listing:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch listing",
      error: error.message,
    });
  }
};



export const getMyListing = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId || userId.length !== 24) {
      return res.status(400).json({ message: "Invalid or missing user ID" });
    }

    // Fetch listings for the logged-in user
    const listings = await listing.find({ postedBy: userId }).sort({ createdAt: -1 }).lean();
     const cleanedListings = await Promise.all(
      listings.map(async (item) => {
        // Remove unwanted fields
        const {
          bids,
          highestBid,
          highestBidder,
          comments,
          ...cleanedListing
        } = item;

        // Fetch user info
        let userData = null;
        if (item.postedBy) {
          const userDoc = await user
            .findById(item.postedBy)
            .select("_id email name phone profilePicture address")
            .lean();
          if (userDoc) userData = userDoc;
        }

        return {
          ...cleanedListing,
          user: userData,
        };
      })
    );



    res.status(200).json({
      success: true,
      data: cleanedListings,
    });
  } catch (error) {
    console.error("Error fetching user's listings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



export const editlisting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; 

    if (!userId || userId.length !== 24) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID" });
    }

    // Destructure allowed fields from body
    const {
      name,
      category,
      quantity,
      price,
      details,
      status,
      address,
      images, 
      listingType,
    } = req.body;

    // Find listing first to verify ownership
    const existingListing = await listing.findById(id);
    if (!existingListing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    // Prevent editing listings that don't belong to the logged-in user
    if (existingListing.postedBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this listing" });
    }

    // Update fields
    existingListing.name = name ?? existingListing.name;
    existingListing.category = category ?? existingListing.category;
    existingListing.quantity = quantity ?? existingListing.quantity;
    existingListing.price = price ?? existingListing.price;
    existingListing.details = details ?? existingListing.details;
    existingListing.status = status ?? existingListing.status;
    existingListing.address = address ?? existingListing.address;
    existingListing.listingType = listingType ?? existingListing.listingType;

    // If images are provided (as base64), update them
    if (images && Array.isArray(images)) {
      existingListing.images = images;
    }

    const updatedListing = await existingListing.save();

    res.status(200).json({
      success: true,
      message: "Listing updated successfully",
    });
  } catch (error) {
    console.error("Error editing listing:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};






export const deletelisting = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; 

    if (!userId || userId.length !== 24) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID" });
    }

    // Find listing first
    const foundListing = await listing.findById(id);
    if (!foundListing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    // Ownership check
    if (foundListing.postedBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this listing" });
    }

    await listing.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete listing",
      error: error.message,
    });
  }
};


export const getAuction = async (req, res) => {
  try {
    const { id } = req.params; // get auction ID
    const userId = req.user?.id; // assume auth middleware sets req.user

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user exists and has auction access
    const requestingUser = await user.findById(userId).populate("plan");
    if (!requestingUser) return res.status(404).json({ error: "User not found" });

    if (!requestingUser.plan || !requestingUser.plan.auctionAccess) {
      return res.status(403).json({ error: "Your plan does not allow access to auctions" });
    }

    if (!id) {
      return res.status(400).json({ error: "Auction ID is required" });
    }

    // Find the auction by ID
    const auction = await listing.findById(id)
      .populate("postedBy", "name email")
      .populate("highestBidder", "name email")
      .populate("bids.user", "name email")
      .populate("comments.user", "name email");

    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    res.status(200).json({ auction });
  } catch (err) {
    console.error("Error fetching auction:", err);
    res.status(500).json({ error: "Server error while fetching auction" });
  }
};



export const bid = async (req, res) => {
  try {
    const { listingId, amount } = req.body;
    const userId = req.user?.id;

    if (!listingId || !amount) {
      return res.status(400).json({ error: "Listing ID and bid amount are required" });
    }

    // Find user and populate plan
    const biddingUser = await user.findById(userId).populate("plan");
    if (!biddingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has auction access
    if (!biddingUser.plan || !biddingUser.plan.auctionAccess) {
      return res.status(403).json({ error: "Your plan does not allow bidding on auctions" });
    }

    // Find the auction listing
    const auction = await listing.findById(listingId);
    if (!auction) {
      return res.status(404).json({ error: "Auction listing not found" });
    }

    if (auction.listingType !== "Auction") {
      return res.status(400).json({ error: "This listing is not an auction" });
    }

    // Check if auction is still active
    const now = new Date();
    if (auction.auctionEndTime && now > auction.auctionEndTime) {
      return res.status(400).json({ error: "Auction has already ended" });
    }

    // Check if bid is higher than current highest
    if (amount <= auction.highestBid) {
      return res.status(400).json({ error: `Bid must be higher than current highest bid (${auction.highestBid})` });
    }

    // Add bid
    auction.bids.push({ user: userId, amount });
    auction.highestBid = amount;
    auction.highestBidder = userId;

    await auction.save();

    res.status(200).json({ message: "Bid placed successfully", auction });
  } catch (err) {
    console.error("Error placing bid:", err);
    res.status(500).json({ error: "Server error while placing bid" });
  }
};



export const comment = async (req, res) => {
  try {
    const { listingId, content } = req.body;
    const userId = req.user?.id; 

    if (!listingId || !content) {
      return res.status(400).json({ error: "Listing ID and comment content are required" });
    }

    // Find user and populate plan
    const commentingUser = await user.findById(userId).populate("plan");
    if (!commentingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has auction access
    if (!commentingUser.plan || !commentingUser.plan.auctionAccess) {
      return res.status(403).json({ error: "Your plan does not allow commenting on auctions" });
    }

    // Find the auction listing
    const auction = await listing.findById(listingId);
    if (!auction) {
      return res.status(404).json({ error: "Auction listing not found" });
    }

    if (auction.listingType !== "Auction") {
      return res.status(400).json({ error: "This listing is not an auction" });
    }

    // Add comment
    auction.comments.push({
      user: userId,
      content,
    });

    await auction.save();

    res.status(200).json({ message: "Comment added successfully", comments: auction.comments });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Server error while adding comment" });
  }
};