import express from "express";
import { createWallet } from "../controllers/createWallet.controller.js";

const router = express.Router();

router.post("/create-wallet", createWallet);

export default router;
