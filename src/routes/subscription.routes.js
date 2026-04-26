import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/Subscription.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/c/:channelId") 
    .post(toggleSubscription)
    .get(getUserChannelSubscribers); // Get subscribers OF this channel

router
    .route("/u/:subscriberId")
    .get(getSubscribedChannels); // Get channels THIS user subscribed to

export default router