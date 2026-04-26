import { v2 as cloudinary } from "cloudinary";
import { promises as fs } from "fs";   // use promise-based fs

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Remove local file after successful upload
    await fs.unlink(localFilePath);

    return response;
  } catch (error) {
    // Cleanup even if upload fails
    if (localFilePath) {
      try {
        await fs.unlink(localFilePath);
      } catch {}
    }
    return null;
  }
};

export { uploadOnCloudinary };