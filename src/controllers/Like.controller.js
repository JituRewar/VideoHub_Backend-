import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  // Validate videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized user");
  }

  //check if already liked
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  //if already liked --> unlike
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res.status(200).json(new ApiResponse(200, {}, "Video unliked"));
  }

  //Else we need to like video

  const like = await Like.create({
    video: videoId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, like, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  //  Validate commentId
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized user");
  }

  // Check if already liked
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  //  If exists → UNLIKE
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res.status(200).json(new ApiResponse(200, {}, "Comment unliked"));
  }

  //  Else → LIKE
  const like = await Like.create({
    comment: commentId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, like, "Comment liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  //  Validate tweetId
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized user");
  }

  // Check if already liked
  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  //  If exists → UNLIKE
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);

    return res.status(200).json(new ApiResponse(200, {}, "Tweet unliked"));
  }

  //  Else → LIKE
  const like = await Like.create({
    tweet: tweetId,
    likedBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, like, "Tweet liked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  //Checking user
  if (!userId) {
    throw new ApiError(401, "Unauthorized user");
  }

  const likedVideos = await Like.aggregate([
    //  Match only current user's liked videos
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $ne: null },
      },
    },

    // video details
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    { $unwind: "$video" },

    // owner details
    {
      $lookup: {
        from: "users",
        localField: "video.owner",
        foreignField: "_id",
        as: "video.owner",
      },
    },
    { $unwind: "$video.owner" },

    // likes count per video
    {
      $lookup: {
        from: "likes",
        localField: "video._id",
        foreignField: "video",
        as: "video.likes",
      },
    },
    {
      $addFields: {
        "video.likesCount": { $size: "$video.likes" },
      },
    },

    //response
    {
      $project: {
        _id: 0,
        "video._id": 1,
        "video.title": 1,
        "video.thumbnail": 1,
        "video.views": 1,
        "video.createdAt": 1,
        "video.likesCount": 1,
        "video.owner._id": 1,
        "video.owner.username": 1,
        "video.owner.avatar": 1,
      },
    },

    
    {
      $replaceRoot: { newRoot: "$video" },
    },

    
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
  );
});

const getVideoLikes = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const likes = await Like.find({ video: videoId });

  const liked = likes.some(
    (l) => l.likedBy.toString() === req.user?._id.toString()
  );

  return res.status(200).json({
    success: true,
    data: {
      count: likes.length,
      liked,
    },
  });
});
export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos,getVideoLikes };
