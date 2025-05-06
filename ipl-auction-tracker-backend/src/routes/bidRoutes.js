import express from "express";
import { placeBid, getBidsForPlayer } from "../controllers/bid.controller.js";
import {
  authMiddleware,
  teamOwnerMiddleware,
} from "../middleware/auth.middleware.js";

const router = express.Router();

export default router;
