import express from "express";
import {
  getMyProfile,
  login,
  newUser,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
  getMyFriends,
} from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  loginValidator,
  registerValidator,
  validateHandler,
  sendFriendRequestValidator,
  acceptFriendRequestValidator,
} from "../lib/validators.js";

const router = express.Router();
router.post(
  "/new",
  singleAvatar,
  registerValidator(),
  validateHandler,
  newUser
);
router.post("/login", loginValidator(), validateHandler, login);

router.get("/me", isAuthenticated, getMyProfile);
router.get("/logout", isAuthenticated, logout);
router.get("/search", isAuthenticated, searchUser);
router.put(
  "/sendrequest",
  isAuthenticated,
  sendFriendRequestValidator(),
  validateHandler,
  sendFriendRequest
);
router.put(
  "/acceptrequest",
  isAuthenticated,
  acceptFriendRequestValidator(),
  validateHandler,
  acceptFriendRequest
);
router.get("/notifications", isAuthenticated, getMyNotifications);
router.get("/friends", isAuthenticated, getMyFriends);

export default router;
