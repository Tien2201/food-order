require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("./models/User");

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

// ── Đăng nhập Google (OAuth) ──
// Chỉ dùng Passport để xử lý bước trao đổi token với Google, KHÔNG dùng
// passport.session() — vì hệ thống đã có cơ chế session viết tay riêng
// (req.session.user) dùng xuyên suốt mọi route/middleware isAdmin/isStaff.
// Sau khi xác thực Google xong, route callback sẽ tự set req.session.user
// theo đúng cấu trúc { _id, fullname, email, role } như đăng nhập thường.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

          if (!email) {
            return done(new Error("Không lấy được email từ tài khoản Google"));
          }

          // Ưu tiên tìm theo googleId (đã từng đăng nhập Google trước đó)
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            // Chưa từng đăng nhập Google — kiểm tra email đã có tài khoản
            // đăng ký thường (email/password) chưa, để gắn googleId vào
            // tài khoản đó thay vì tạo trùng tài khoản mới.
            user = await User.findOne({ email });

            if (user) {
              user.googleId = profile.id;
              await user.save();
            } else {
              user = await User.create({
                fullname: profile.displayName || "Khách hàng Google",
                email,
                googleId: profile.id,
                role: "customer"
              });
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  app.use(passport.initialize());
}

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
  console.error("===== LỖI SERVER (chi tiết đầy đủ) =====");
  console.error("typeof err:", typeof err);
  console.error("err:", err);
  console.error("err.message:", err && err.message);
  console.error("err.name:", err && err.name);
  console.error("err.code:", err && err.code);
  console.error("err.stack:", err && err.stack);
  console.error("==========================================");

  const safeMessage =
    (err && err.message) ||
    (typeof err === "string" ? err : null) ||
    "Lỗi không xác định, xem chi tiết trong log server";

  res.status(500).send("Đã xảy ra lỗi: " + safeMessage);
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
});