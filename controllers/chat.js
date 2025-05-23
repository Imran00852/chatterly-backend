import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import {
  deleteFilesFromCloudinary,
  emitEvent,
  uploadFileToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

export const newGroupChat = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  const allMembers = [...members, req.user];

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group chat`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group Created!",
  });
});

export const getMyChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user._id }).populate(
    "members",
    "name avatar"
  );
  const transformedChats = chats.map(({ _id, name, groupChat, members }) => {
    const otherMember = getOtherMember(members, req.user._id);
    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      name: groupChat ? name : otherMember.name,
      members: members
        .map((member) => member._id)
        .filter((id) => id.toString() !== req.user._id.toString()),
    };
  });

  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

export const getMyGroups = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user._id,
    groupChat: true,
    creator: req.user._id,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, name, _id, groupChat }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  return res.status(200).json({
    success: true,
    groups,
  });
});

export const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found!", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat!", 400));

  if (chat.creator._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("You are not allowed to add members!", 403));
  }

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

  const allNewMembers = await Promise.all(allNewMembersPromise);

  if (allNewMembers.some((member) => chat.members.includes(member._id))) {
    return next(new ErrorHandler("Some members are already in the chat!", 400));
  }

  chat.members.push(...allNewMembers.map((i) => i._id));

  if (chat.members.length > 100)
    return next(new ErrorHandler("Group members limit reached!", 400));

  await chat.save();

  const allUsersName = allNewMembers.map((i) => i.name).join(",");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUsersName} has been added to the group`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);

  res.status(201).json({
    success: true,
    message: "Members added successfully!",
  });
});

export const removeMember = TryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;

  const [chat, userThatWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("Chat not found!", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat!", 400));

  if (chat.creator._id.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandler("You are not allowed to remove members!", 403)
    );
  }

  if (chat.members.length <= 3) {
    return next(new ErrorHandler("Group must have at least 3 members!", 400));
  }
  const allChatMembers = chat.members.map((i) => i.toString());
  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );
  await chat.save();

  emitEvent(req, ALERT, chat.members, {
    message: `${userThatWillBeRemoved.name} has been removed from the group`,
    chatId,
  });
  emitEvent(req, REFETCH_CHATS, allChatMembers);

  return res.status(200).json({
    success: true,
    message: "Member removed successfully!",
  });
});

export const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found!", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat!", 400));

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user._id.toString()
  );

  if (remainingMembers.length < 3) {
    return next(new ErrorHandler("Group must have at least 3 members!", 400));
  }

  if (chat.creator._id.toString() === req.user._id.toString()) {
    const randomMember = Math.floor(Math.random() * remainingMembers.length);
    chat.creator = remainingMembers[randomMember];
  }

  chat.members = remainingMembers;
  const [user] = await Promise.all(
    [User.findById(req.user._id, "name")],
    chat.save()
  );

  emitEvent(req, ALERT, chat.members, {
    message: `${user.name} has left the group`,
    chatId,
  });
  

  return res.status(200).json({
    success: true,
    message: "You have left the group!",
  });
});

export const sendAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const files = req.files || [];
  if (files.length < 1)
    return next(new ErrorHandler("Please provide attachments", 400));

  if (files.length > 5)
    return next(new ErrorHandler("Max 5 files allowed", 400));

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user._id, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found!", 404));

  //upload files here
  const attachments = await uploadFileToCloudinary(files);

  const messageForRealTime = {
    content: "",
    attachments,
    sender: {
      _id: me._id,
      name: me.name,
    },
    chat: chatId,
  };
  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, {
    chatId,
  });
  return res.status(201).json({
    success: true,
    message,
  });
});

export const getChatDetails = TryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) return next(new ErrorHandler("Chat not found!", 404));
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("Chat not found!", 404));
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

export const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found!", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat!", 400));

  if (chat.creator.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandler("You are not allowed to rename the group!", 403)
    );
  }
  chat.name = name;
  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Group name updated successfully!",
  });
});

export const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found!", 404));

  const members = chat.members;

  if (chat.groupChat && chat.creator.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandler("You are not allowed to delete this group!", 403)
    );
  }
  if (chat.groupChat && !members.includes(req.user._id.toString())) {
    return next(
      new ErrorHandler("You are not allowed to delete this group!", 403)
    );
  }

  //here we have to delete all messages as well as attachments or files from cloudinary
  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => public_ids.push(public_id));
  });

  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);
  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully!",
  });
});

export const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const limit = 20;
  const skip = (page - 1) * limit;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found!", 404));
  if (!chat.members.includes(req.user._id.toString()))
    return next(
      new ErrorHandler("You are not allowed to access this chat!", 403)
    );

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);
  const totalPages = Math.ceil(totalMessagesCount / limit) || 0;
  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});
