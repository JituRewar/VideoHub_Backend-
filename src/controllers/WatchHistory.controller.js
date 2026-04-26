import { WatchHistory } from "../models/watchHistory.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const saveProgress = asyncHandler(async (req, res) => {
  const { videoId, progress } = req.body;

  const record = await WatchHistory.findOneAndUpdate(
    { user: req.user._id, video: videoId },
    { progress },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: record });
});

export const getProgress = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const record = await WatchHistory.findOne({
    user: req.user._id,
    video: videoId,
  });

  res.json({ success: true, data: record });
});