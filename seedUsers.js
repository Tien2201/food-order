require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  await User.deleteMany({});

  const adminPass = await bcrypt.hash("123", 10);
  const staffPass = await bcrypt.hash("123", 10);

  await User.create([
    {
      fullname: "Admin",
      email: "tien20032004@gmail.com",
      password: adminPass,
      role: "admin"
    },
    {
      fullname: "minhanh",
      email: "staff@gmail.com",
      password: staffPass,
      role: "staff"
    }
  ]);

  console.log("Đã tạo admin và nhân viên");
  process.exit();
};

run();
