import listing from '../models/listingModel.js';
import user from "../models/userModel.js";
import multer from 'multer';
import { google } from 'googleapis';
import { Readable } from 'stream';




// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB per file
  fileFilter: (req, file, cb) => {
    // Optional: validate file types (e.g., images only)
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
}).array('images', 5); // max 5 files

// Google Drive auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN,
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// Function to upload a file to Google Drive
const uploadToDrive = async (file) => {
  const fileMetadata = {
    name: file.originalname,
    parents: ['1mQF1TYqTj2I2Kg8d3__hhl-juxbOdHmH'], // Your folder ID
  };
  const media = {
    mimeType: file.mimetype,
    body: Readable.from(file.buffer),
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id',
  });

  const fileId = response.data.id;
  const directLink = `https://drive.google.com/uc?export=view&id=${fileId}`;
  return directLink;
};




export const addlisting = async (req, res) => {
   upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

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
        postedBy
      } = req.body;

      const imageFiles = req.files;
      let uploadedImageLinks = [];

      // Upload each image to Google Drive
      if (imageFiles && imageFiles.length > 0) {
        for (const file of imageFiles) {
          const driveUrl = await uploadToDrive(file);
          uploadedImageLinks.push(driveUrl);
        }
      }

      // Create the new listing document
      const newListing = new listing({
        name,
        category,
        price,
        quantity,
        postedBy,
        details,
        status,
        address,
        images: uploadedImageLinks, 
        listingType,
      });

      const savedListing = await newListing.save();

      res.status(201).json({
        message: 'Listing added successfully!',
        listing: savedListing,
      });
    } catch (error) {
      console.error('Error adding listing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
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





function extractFileId(file) {
  if (typeof file === 'string') {
    try {
      const url = new URL(file);
      const id = url.searchParams.get('id');
      if (id) return id;
      return file;
    } catch (e) {
      return file;
    }
  }
  if (file.fileId) return file.fileId;
  return null;
}

export const deletelisting = async (req, res) => {
  try {
    const { id } = req.params;

    const foundListing = await listing.findById(id);
    if (!foundListing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const fileIds = foundListing.images?.map(extractFileId).filter(Boolean);

    for (const fileId of fileIds) {
      try {
        await drive.files.delete({ fileId });
      } catch (driveErr) {
        console.error(`Failed to delete Google Drive file with id ${fileId}`, driveErr);
      }
    }

    await listing.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Listing and images deleted successfully",
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to delete listing",
      error: error.message,
    });
  }
};
