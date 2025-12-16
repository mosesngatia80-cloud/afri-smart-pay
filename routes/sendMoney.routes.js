import express from "express";
import { sendMoney } from "../controllers/sendMoney.controller.js";

const router = express.Router();

router.post("/send-money", sendMoney);

export default router;
