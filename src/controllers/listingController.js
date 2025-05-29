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
        images,
        price,
        listingType,
        postedBy
      } = req.body;

  
      const newListing = new listing({
        name,
        category,
        price,
        quantity,
        postedBy,  
        details,
        status,
        address,
        images,
        listingType
      });
  
      const savedListing = await newListing.save();
  
      res.status(201).json({
        message: "Listing added successfully",
        listing: savedListing
      });
    } catch (error) {
      console.error("Error adding listing:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };



  export const getalllistings = async (req, res) => {
    try {
      const listings = await listing.find();
  
      const listingsWithUser = await Promise.all(
        listings.map(async (item) => {
          const userData = await user.findOne({ _id: item.postedBy }).select('-password -verified').lean();
          return {
            ...item.toObject(),
            user: userData || null,
          };
        })
      );
  
      res.status(200).json({
        success: true,
        data: listingsWithUser,
      });
    } catch (error) {
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

    const listingItem = await listing.findById(id);
    if (!listingItem) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const userData = await user.findOne({ _id: listingItem.postedBy }).select('-password -verified').lean();

    res.status(200).json({
      success: true,
      data: {
        ...listingItem.toObject(),
        user: userData || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch listing",
      error: error.message,
    });
  }
};


export const getMyListing = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId length
    if (!id || id.length !== 24) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const listings = await listing.find({ postedBy: id }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: listings });
  } catch (error) {
    console.error('Error fetching listings for user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const editlisting = async (req, res) => {
  try {
    const { id } = req.params;

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
      postedBy
    } = req.body;

    const updatedListing = await listing.findByIdAndUpdate(
      id,
      {
        name,
        category,
        quantity,
        details,
        price,
        status,
        address,
        images,
        listingType,
        postedBy
      },
      { new: true } // return the updated document
    );

    if (!updatedListing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      listing: updatedListing,
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

    const deletedListing = await listing.findByIdAndDelete(id);
    if (!deletedListing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
      data: deletedListing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete listing",
      error: error.message,
    });
  }
};