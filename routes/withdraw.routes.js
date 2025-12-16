import express from "express";
import { withdraw } from "../controllers/withdraw.controller.js";

const router = express.Router();

router.post("/withdraw", withdraw);

export default router;
