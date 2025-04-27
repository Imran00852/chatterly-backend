import express from "express";
import {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachments,
  getMessages,
  getChatDetails,
  renameGroup,
  deleteChat,
} from "../controllers/chat.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import {
  newChatValidator,
  validateHandler,
  addMembersValidator,
  removeMemberValidator,
  sendAttachmentValidator,
  chatIdValidator,
  renameGroupValidator,
} from "../lib/validators.js";

const router = express.Router();

router.post(
  "/new",
  isAuthenticated,
  newChatValidator(),
  validateHandler,
  newGroupChat
);

router.get("/my", isAuthenticated, getMyChats);

router.get("/my/groups", isAuthenticated, getMyGroups);

router.put(
  "/addmembers",
  isAuthenticated,
  addMembersValidator(),
  validateHandler,
  addMembers
);

router.put(
  "/removemember",
  isAuthenticated,
  removeMemberValidator(),
  validateHandler,
  removeMember
);

router.delete(
  "/leave/:id",
  isAuthenticated,
  chatIdValidator(),
  validateHandler,
  leaveGroup
);

router.post(
  "/message",
  isAuthenticated,
  attachmentsMulter,
  sendAttachmentValidator(),
  validateHandler,
  sendAttachments
);

router.get(
  "/message/:id",
  isAuthenticated,
  chatIdValidator(),
  validateHandler,
  getMessages
);

router
  .route("/:id")
  .get(isAuthenticated, chatIdValidator(), validateHandler, getChatDetails)
  .put(isAuthenticated, renameGroupValidator(), validateHandler, renameGroup)
  .delete(isAuthenticated, chatIdValidator(), validateHandler, deleteChat);

export default router;
