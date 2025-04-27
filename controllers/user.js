import { TryCatch } from "../middlewares/error.js";
import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import {
  emitEvent,
  sendToken,
  uploadFileToCloudinary,
} from "../utils/features.js";
import bcrypt from "bcrypt";
import { ErrorHandler } from "../utils/utility.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";

export const newUser = TryCatch(async (req, res, next) => {
  const { name, username, bio, password } = req.body;

  const file = req.file;
  if (!file) return next(new ErrorHandler("Please upload an image!", 400));

  const result = await uploadFileToCloudinary([file]);

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const userExist = await User.findOne({ username });
  if (userExist) return next(new ErrorHandler("User already exists!", 400));

  const user = await User.create({
    name,
    username,
    bio,
    password,
    avatar,
  });

  sendToken(res, user, 201, "Registered Successfully");
});

export const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  const userExist = await User.findOne({ username }).select("+password");
  if (!userExist) return next(new ErrorHandler("User not found!", 404));

  const isMatch = await bcrypt.compare(password, userExist.password);
  if (!isMatch) return next(new ErrorHandler("Invalid Credentials", 400));

  sendToken(res, userExist, 200, `Welcome Back, ${userExist.name}`);
});

export const getMyProfile = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const logout = (req, res) => {
  res
    .status(200)
    .cookie("token", "", {
      maxAge: 0,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({
      success: true,
      message: "Logged out successfully!",
    });
};

export const searchUser = TryCatch(async (req, res, next) => {
  const { name = "" } = req.query;

  //find my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user._id });

  //extract all members from my chats
  const myChatMembers = myChats.map((chat) => chat.members).flat();

  //get all members except me and my chats members
  const allMembersExceptMeAndFriends = await User.find({
    _id: { $nin: [...myChatMembers, req.user._id] },
    name: { $regex: name, $options: "i" },
  });

  const users = allMembersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users,
  });
});

export const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent!", 400));

  await Request.create({
    sender: req.user._id,
    receiver: userId,
  });
  emitEvent(req, NEW_REQUEST, [userId]);
  return res.status(200).json({
    success: true,
    message: "Friend request sent!",
  });
});

export const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;
  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");
  if (!request) return next(new ErrorHandler("Request not found!", 404));
  if (request.receiver._id.toString() !== req.user._id.toString())
    return next(
      new ErrorHandler("You are not authorized to accept this request!", 403)
    );

  if (!accept) {
    await Request.deleteOne({ _id: requestId });
    return res.status(200).json({
      success: true,
      message: "Friend request rejected!",
    });
  }
  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Friend request accepted!",
    senderId: request.sender._id,
  });
});

export const getMyNotifications = TryCatch(async (req, res, next) => {
  const requests = await Request.find({ receiver: req.user._id }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ sender, _id }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequests,
  });
});

export const getMyFriends = TryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user._id,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherMembers = getOtherMember(members, req.user._id);
    return {
      _id: otherMembers._id,
      name: otherMembers.name,
      avatar: otherMembers.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});
