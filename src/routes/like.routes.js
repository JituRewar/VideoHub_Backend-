import { Router } from 'express';
import {
    getLikedVideos,
    toggleCommentLike,
    toggleVideoLike,
    toggleTweetLike,
    getVideoLikes
} from "../controllers/Like.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT);

router.route("/video/:videoId").patch(toggleVideoLike);
router.route("/comment/:commentId").patch(toggleCommentLike);
router.route("/tweet/:tweetId").patch(toggleTweetLike);
router.route("/videos").get(getLikedVideos);
router.get("/video/:videoId", verifyJWT, getVideoLikes);

export default router