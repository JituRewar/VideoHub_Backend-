import { Router } from 'express';
import {
 saveProgress,
 getProgress
} from "../controllers/WatchHistory.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT);

router.post("/progress", verifyJWT, saveProgress);
router.get("/progress/:videoId", verifyJWT, getProgress);

export default router