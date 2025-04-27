import { User } from "../models/user.js";

import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import jwt from "jsonwebtoken";
import { adminSecretKey } from "../app.js";

export const isAuthenticated = TryCatch(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) return next(new ErrorHandler("Login first!", 401));
  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decodedData._id);
  req.user = user;
  next();
});

export const isAdmin = TryCatch(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) return next(new ErrorHandler("Only admin can access", 401));

  const secretKey = jwt.verify(token, process.env.JWT_SECRET);

  const isMatch = secretKey === adminSecretKey;
  if (!isMatch) return next(new ErrorHandler("Invalid secret key", 401));

  next();
});

export const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(new ErrorHandler(err.message, 500));

    const authToken = socket.request.cookies.token;
    if (!authToken) return next(new ErrorHandler("Login first!", 401));

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    socket.user = await User.findById(decodedData._id);

    return next();
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};
