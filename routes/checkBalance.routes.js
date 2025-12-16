import express from "express";
import { checkBalance } from "../controllers/checkBalance.controller.js";

const router = express.Router();

router.get("/check-balance/:phone", checkBalance);

export default router;
