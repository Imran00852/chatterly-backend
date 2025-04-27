import { body, validationResult, param } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  const errMsg = errors
    .array()
    .map((err) => err.msg)
    .join(",");

  if (errors.isEmpty()) return next();
  else return next(new ErrorHandler(errMsg, 400));
};

const registerValidator = () => [
  body("name", "name is required").notEmpty().trim(),
  body("username", "username is required").notEmpty().trim(),
  body("bio", "bio is required").notEmpty().trim(),
  body("password", "password is required").notEmpty().trim(),
];

const loginValidator = () => [
  body("username", "username is required").notEmpty().trim(),
  body("password", "password is required").notEmpty().trim(),
];

const newChatValidator = () => [
  body("name", "Group name is required").notEmpty().trim(),
  body("members")
    .notEmpty()
    .withMessage("members are required")
    .isArray({ min: 2, max: 100 })
    .withMessage("members must be between 2 and 100"),
];

const addMembersValidator = () => [
  body("chatId", "Chat ID is required").notEmpty().trim(),
  body("members")
    .notEmpty()
    .withMessage("members are required")
    .isArray({ min: 1, max: 97 })
    .withMessage("members must be between 1 and 97"),
];

const removeMemberValidator = () => [
  body("userId", "User ID is required").notEmpty().trim(),
  body("chatId", "Chat ID is required").notEmpty().trim(),
];

const sendAttachmentValidator = () => [
  body("chatId", "Chat ID is required").notEmpty().trim(),
];

const chatIdValidator = () => [
  param("id", "Chat ID is required").notEmpty().trim(),
];

const renameGroupValidator = () => [
  param("id", "Chat ID is required").notEmpty().trim(),
  body("name", "Group name is required").notEmpty().trim(),
];

const sendFriendRequestValidator = () => [
  body("userId", "User ID is required").notEmpty().trim(),
];

const acceptFriendRequestValidator = () => [
  body("requestId", "Request ID is required").notEmpty().trim(),
  body("accept")
    .notEmpty()
    .withMessage("accept is required")
    .isBoolean()
    .trim()
    .withMessage("accept must be a boolean"),
];

const adminLoginValidator = () => [
  body("secretKey", "Secret Key is required").notEmpty().trim(),
];

export {
  registerValidator,
  validateHandler,
  loginValidator,
  newChatValidator,
  addMembersValidator,
  removeMemberValidator,
  sendAttachmentValidator,
  chatIdValidator,
  renameGroupValidator,
  sendFriendRequestValidator,
  acceptFriendRequestValidator,
  adminLoginValidator,
};
