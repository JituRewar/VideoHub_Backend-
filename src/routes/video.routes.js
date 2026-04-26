import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  getVideosByUser
} from "../controllers/Video.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/").get(getAllVideos);
router.route("/user/:userId").get(getVideosByUser);
router.route("/:videoId").get(getVideoById);

router.route("/").post(
  verifyJWT,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);

router.route("/:videoId/toggle").patch(verifyJWT, togglePublishStatus);

router
  .route("/:videoId")
  .patch(verifyJWT, upload.single("thumbnail"), updateVideo);

router.route("/:videoId").delete(verifyJWT, deleteVideo);

export default router;
