import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist

  //validating name and description
  if (!name || !description) {
    throw new ApiError(400, "Name and description are required");
  }

  //get user
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized user");
  }

  //creating playlist
  const playlist = await Playlist.create({
    name,
    description,
    owner: userId,
    videos: [],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const playlists = await Playlist.aggregate([
    //matching playlist of user
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },

    //get videos
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    //owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },
    //adding fields
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
      },
    },

    //returning response
    {
      $project: {
        name: 1,
        description: 1,
        totalVideos: 1,
        createdAt: 1,
        //videos
        videos: {
          _id: 1,
          title: 1,
          thumbnail: 1,
        },

        //owner
        "owner.id": 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  const currentUserId = req.user?._id;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.aggregate([
    //matching playlist
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    //owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: "$owner" },

    //videos
    {
      $lookup: {
        from: "videos",
        let: { videoIds: "$videos" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$_id", "$$videoIds"] },
            },
          },
          //video owner
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
            },
          },
          { $unwind: "$owner" },
          //likes
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "likes",
            },
          },
          //computed fields
          {
            $addFields: {
              likesCount: { $size: "$likes" },
              isLiked: {
                $in: [
                  new mongoose.Types.ObjectId(currentUserId),
                  "$likes.likedBy",
                ],
              },
            },
          },

          //video response
          {
            $project: {
              title: 1,
              thumbnail: 1,
              duration: 1,
              views: 1,
              createdAt: 1,
              likesCount: 1,
              isLiked: 1,
              "owner.username": 1,
              "owner.avatar": 1,
            },
          },
        ],
        as: "videos",
      },
    },

    // adding playlist fields
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
      },
    },

    {
      $project: {
        name: 1,
        description: 1,
        totalVideos: 1,
        createdAt: 1,

        videos: 1,

        "owner._id": 1,
        "owner.username": 1,
        "owner.avatar": 1,
      },
    },
  ]);

  if (!playlist.length) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "playlist not found");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "video not found");
  }

  // Find playlist
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  //owner matching
  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not allowed to modify this playlist");
  }

  //preventing duplicating videos
  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video is already exist in playlist");
  }

  // Check video exists
  const videoExists = await Video.findById(videoId);
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  //adding video
  playlist.videos.push(videoId);
  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  // Validate IDs
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist or video id");
  }

  // remove using $pull
  const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: userId,
    },
    {
      $pull: { videos: videoId }, // removes video if exists
    },
    { new: true }
  );

  //  not found
  if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found or unauthorized");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video removed from playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user?._id;
  // TODO: delete playlist
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  //atomic delete
  const deletePlaylist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: userId, //ensuring only user can delete this playlist
  });

  if (!deletePlaylist) {
    throw new ApiError(404, "Playlist not found or unauthorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "playlist deleted successfully"));
});


export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
};
