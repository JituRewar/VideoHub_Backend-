import mongoose from "mongoose"
import {Video} from "../models/video.models.js"
import {Subscription} from "../models/subscription.models.js"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const channelId = req.user?._id

    if(!channelId){
        throw new ApiError(401, "Unauthorized")
    }

    //total vidoe
    const totalVideos = await Video.countDocuments({
        owner: channelId
    })

    //total view
    const viewResult = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" }
            }
        }
    ])

    const totalViews = viewResult[0]?.totalViews || 0

    //total subscriber
    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    })

     // total likes (on all videos of this channel)
     const likesResult = await Like.aggregate([
        {
           $lookup: {
            from: "videos",
            localField: "video",
            foreignField: "_id",
            as: "videoDetails"
           }
        },
        {
            $unwind: "$videoDetails"
        },

        {
            $match: {
                "videoDetails.owner": new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: 1 }
            }
        }
     ])

     const totalLikes = likesResult[0]?.totalLikes || 0

     return res.status(200).json(
        new ApiResponse(200,
            {
                totalVideos,
                totalViews,
                totalSubscribers,
                totalLikes,
            },
            "channel stats fetched successfully"
        )
     )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = req.user?._id

    if (!channelId) {
        throw new ApiError(401, "Unauthorized")
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                likesCount: 1,
                thumbnail: 1
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, videos, "Channel videos fetched successfully")
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }