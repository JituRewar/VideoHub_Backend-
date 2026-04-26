import mongoose from "mongoose";

const watchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  video: {
    type: mongoose.Types.ObjectId,
    ref: "Video",
  },
  progress: {
    type: Number, // seconds
    default: 0,
  },
}, { timestamps: true });

export const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);