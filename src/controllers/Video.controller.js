import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { time } from "console";
import { title } from "process";

const getAllVideos = asyncHandler(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  const skip = (page - 1) * limit;

  let filter = {};

  //  Search
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  // Filter by owner
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }
    filter.owner = new mongoose.Types.ObjectId(userId);
  }

  // Sorting
  const sortOptions = {};
  sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

  // Total count
  const totalVideos = await Video.countDocuments(filter);

  //  Aggregation
  const videos = await Video.aggregate([
    { $match: filter },

    //  Owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },

    // Likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },

    // Final fields
    {
      $project: {
        title: 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        likesCount: 1,
        "owner._id": 1,
        "owner.username": 1,
        "owner.avatar": 1,
        "owner.fullName": 1,
      },
    },

    { $sort: sortOptions },
    { $skip: skip },
    { $limit: limit },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        totalVideos,
        currentPage: page,
        totalPages: Math.ceil(totalVideos / limit),
      },
      "Videos fetched successfully"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is missing");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is missing");
  }

  // Upload
  const videoUpload = await uploadOnCloudinary(videoLocalPath);
  const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoUpload?.url) {
    throw new ApiError(500, "Video upload failed");
  }

  if (!thumbnailUpload?.url) {
    throw new ApiError(500, "Thumbnail upload failed");
  }

  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }

  const video = await Video.create({
    videoFile: videoUpload.url,
    thumbnail: thumbnailUpload.url,
    title,
    description,
    duration: videoUpload.duration || 0,
    owner: req.user._id,
    isPublished: true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  //  Increment views
  await Video.findByIdAndUpdate(videoId, {
    $inc: { views: 1 },
  });

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },

    //  Owner
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },

    // Subscribers Count
    {
      $lookup: {
        from: "subscriptions",
        localField: "owner._id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        "owner.subscribersCount": { $size: "$subscribers" },
      },
    },

    //  Likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },

    // Comments
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $addFields: {
        commentsCount: { $size: "$comments" },
      },
    },

    //  Output
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        likesCount: 1,
        commentsCount: 1,
        "owner._id": 1,
        "owner.username": 1,
        "owner.avatar": 1,
        "owner.fullName": 1,
        "owner.subscribersCount": 1,
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (title) video.title = title;
  if (description) video.description = description;

  // Thumbnail update
  const thumbnailLocalPath = req.file?.path;

  if (thumbnailLocalPath) {
    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnailUpload?.url) {
      throw new ApiError(500, "Thumbnail update failed");
    }

    video.thumbnail = thumbnailUpload.url;
  }

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  //  Delete from Cloudinary
  const getPublicId = (url) => url.split("/").pop().split(".")[0];

  const videoPublicId = getPublicId(video.videoFile);
  const thumbnailPublicId = getPublicId(video.thumbnail);

  await cloudinary.uploader.destroy(videoPublicId, {
    resource_type: "video",
  });

  await cloudinary.uploader.destroy(thumbnailPublicId);

  // Delete from DB
  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  video.isPublished = !video.isPublished;

  await video.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      video,
      `Video is now ${video.isPublished ? "Published" : "Unpublished"}`
    )
  );
});

const getVideosByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const videos = await Video.find({ owner: userId })
    .sort({ createdAt: -1 })
    .populate("owner", "avatar fullName username")
    .select("title thumbnail duration views createdAt owner");

  return res.status(200).json(
    new ApiResponse(200, videos, "User videos fetched successfully")
  );
});


export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getVideosByUser,
  
};
