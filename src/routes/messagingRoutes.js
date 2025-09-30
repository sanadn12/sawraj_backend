import express from "express";
import { createOrGetChat, getUserChats, getChatMessages } from "../controllers/messagingController.js";
import authenticateJWT from "../middlewares/jwtauth.js";

const router = express.Router();


router.post("/", authenticateJWT, createOrGetChat);
router.get("/", authenticateJWT, getUserChats);
router.get("/:chatId/messages", authenticateJWT, getChatMessages);



export default router;
