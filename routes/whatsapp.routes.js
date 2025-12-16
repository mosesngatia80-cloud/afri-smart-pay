import express from "express";
import { handleWhatsAppMessage } from "../controllers/whatsapp.controller.js";

const router = express.Router();

// webhook receiver
router.post("/whatsapp/webhook", handleWhatsAppMessage);

export default router;
