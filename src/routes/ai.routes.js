import { Router } from "express";
import { askAI } from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Secure the route so only logged-in users can chat
router.route("/ask").post(verifyJWT, askAI);

export default router;