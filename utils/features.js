import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuid } from "uuid";
import { getBase64, getSockets } from "../lib/helper.js";

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res
    .status(code)
    .cookie("token", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({
      success: true,
      message,
      user,
    });
};

const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const getUsers = getSockets(users);
  io.to(getUsers).emit(event, data);
};

const uploadFileToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) throw reject(error);
          resolve(result);
        }
      );
    });
  });
  try {
    const results = await Promise.all(uploadPromises);
    const formattedResults = results.map((result) => {
      return {
        public_id: result.public_id,
        url: result.secure_url,
      };
    });
    return formattedResults;
  } catch (error) {
    throw new Error("Error uploading files to cloudinary", error);
  }
};

const deleteFilesFromCloudinary = async (public_ids) => {};

export {
  sendToken,
  emitEvent,
  deleteFilesFromCloudinary,
  uploadFileToCloudinary,
};
