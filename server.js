require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const staffRoutes = require("./routes/staffRoutes");
const customerRoutes = require("./routes/customerRoutes");

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "food_order_secret",
    resave: false,
    saveUninitialized: false
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log("MongoDB Error:", err.message);
  });

app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/staff", staffRoutes);
app.use("/", customerRoutes);

// Error handler tổng quát - bắt lỗi từ multer/Cloudinary và mọi middleware khác
// Phải đặt SAU tất cả routes, có đủ 4 tham số (err, req, res, next) để Express
// nhận diện đây là error-handling middleware.
app.use((err, req, res, next) => {
  console.error("LỖI SERVER:", err.message);
  console.error(err.stack);
  res.status(500).send("Đã xảy ra lỗi: " + err.message);
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
});