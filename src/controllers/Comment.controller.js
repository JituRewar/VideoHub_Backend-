import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  let { page = 1, limit = 10 } = req.query;

  //  Validate videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  //  Convert page & limit to numbers
  page = parseInt(page);
  limit = parseInt(limit);

  const skip = (page - 1) * limit;

  //  Fetch comments
  const totalComments = await Comment.countDocuments({
  video: videoId,
});

const comments = await Comment.aggregate([
  {
    $match: {
      video: new mongoose.Types.ObjectId(videoId),
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
    },
  },
  { $unwind: "$owner" },
  {
    $lookup: {
      from: "likes",
      localField: "_id",
      foreignField: "comment",
      as: "likes",
    },
  },
  {
    $addFields: {
      likesCount: { $size: "$likes" },
    },
  },
  {
    $project: {
      content: 1,
      createdAt: 1,
      likesCount: 1,
      "owner.avatar": 1,
      "owner.username": 1,
    },
  },
  { $sort: { createdAt: -1 } },
  { $skip: skip },
  { $limit: limit },
]);

  //  Send response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        totalComments,
        currentPage: page,
        totalPages: Math.ceil(totalComments / limit),
      },
      "Comments fetched successfully"
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  //validating video id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  //validating content
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content is required");
  }

  //video exist or not
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  //get user
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  //creating comment
  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment ID");

  }

  //validating content
  if(!content || content.trim()===""){
    throw new ApiError(400, "Content is required");
  }

  //checking comment exist or not
  const comment = await Comment.findById(commentId);

   if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  //owner check
  if(comment.owner.toString()!==req.user?._id.toString()){
    throw new ApiError(403, "You are not allowed to update this comment");
  }

  //update field
  comment.content = content.trim();

  //saving
  await comment.save();

  return res.status(200).json(
    new ApiResponse(200,comment,"comment updated successfully")
  );
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  //validate comment id
  if(!isValidObjectId(commentId)){
    throw new ApiError(400,"Invalied comment id");
  }

  //find comment
  const comment = await Comment.findById(commentId);

  if(!comment){
    throw new ApiError(404,"comment not found");
  }

  //owner checking
  if(comment.owner.toString()!==req.user?._id.toString()){
    throw new ApiError(403,"you are not allowed to delete this comment");
  }

  //delete comment
  await Comment.findByIdAndDelete(commentId);

  return res.status(200).json(
    new ApiResponse(200,{},"comment deleted Successfully")
  );
});

export { getVideoComments, addComment, updateComment, deleteComment };
