import mongoose, { isValidObjectId, mongo } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;

  // Validate userId
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const tweets = await Tweet.aggregate([
    // Match tweets of specific user
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },

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

    //  Likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },

    //  Add fields
    {
      $addFields: {
        likesCount: { $size: "$likes" },

        // isLiked or not
        isLiked: {
          $in: [
            new mongoose.Types.ObjectId(currentUserId),
            "$likes.likedBy",
          ],
        },
      },
    },

    // Clean response
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        isLiked: 1,
        "owner._id": 1,
        "owner.username": 1,
        "owner.avatar": 1,
        "owner.fullName": 1,
      },
    },

    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200, tweets, "User tweets fetched successfully")
  );
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  //  Validate tweetId
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // Find tweet
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  //  Ownership check
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to update this tweet");
  }

  // Update content
  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  tweet.content = content;
  await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  // Validate tweetId
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  // Find tweet
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  //  Ownership check
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to delete this tweet");
  }

  //  Delete tweet
  await tweet.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
