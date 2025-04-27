import mongoose from "mongoose";

export const connectDB = async (uri) => {
  await mongoose
    .connect(uri, { dbName: "ChatWapp" })
    .then((c) => console.log(`Db connected on host ${c.connection.host}`))
    .catch((err) => {
      throw err;
    });
};
