import listing from '../models/listingModel.js';
import user from "../models/userModel.js";
import multer from 'multer';
import { google } from 'googleapis';
import { Readable } from 'stream';







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
    } = req.body;

    // Get user from JWT (middleware must set req.user)
    const postedBy = req.user?.id;
    if (!postedBy) {
      return res.status(401).json({ error: "Unauthorized: No user found in token" });
    }

    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (typeof img !== "string" || !img.startsWith("data:image")) {
          return res.status(400).json({ error: "Invalid image format" });
        }
      }
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
    });

    const savedListing = await newListing.save();

    res.status(201).json({
      message: "Listing added successfully!",
      listing: savedListing,
    });

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
        let userData = null;
        if (item.postedBy) {
          try {
            userData = await user
              .findById(item.postedBy)
              .select("-password -verified")
              .lean();
          } catch (err) {
            console.warn(`Could not fetch user for listing ${item._id}:`, err);
          }
        }

        return {
          ...item,
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
        userData = await user
          .findById(listingItem.postedBy)
          .select("-password -verified")
          .lean();
      } catch (err) {
        console.warn(`Could not fetch user for listing ${id}:`, err);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...listingItem,
        user: userData || null,
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

    res.status(200).json({
      success: true,
      data: listings,
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

