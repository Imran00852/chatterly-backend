import express from "express";

import {
  adminLogin,
  adminLogout,
  getAdminData,
  getAllChats,
  getAllMessages,
  getAllUsers,
  getDashboardStats,
} from "../controllers/admin.js";

import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { isAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.post("/verify", adminLoginValidator(), validateHandler, adminLogin);
router.get("/logout", adminLogout);

//only admin can access these routes
router.use(isAdmin);
router.get("/", getAdminData);
router.get("/users", getAllUsers);
router.get("/chats", getAllChats);
router.get("/messages", getAllMessages);
router.get("/stats", getDashboardStats);

export default router;
