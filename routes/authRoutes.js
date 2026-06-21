const express = require("express");
const bcrypt = require("bcryptjs");
const passport = require("passport");

const router = express.Router();
const User = require("../models/User");

router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  try {
    const { fullname, email, password, confirmPassword } = req.body;

    // Validate phía server — không chỉ dựa vào JS phía client, vì JS có thể
    // bị tắt hoặc bị bỏ qua khi gửi request trực tiếp.
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.render("register", { error: "Mật khẩu nhập lại không khớp" });
    }

    if (!password || password.length < 6) {
      return res.render("register", { error: "Mật khẩu cần tối thiểu 6 ký tự" });
    }

    const checkUser = await User.findOne({ email });

    if (checkUser) {
      return res.render("register", { error: "Email đã tồn tại" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullname,
      email,
      password: hashPassword,
      role: "customer"
    });

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.render("register", { error: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.render("login", { error: "Tài khoản không tồn tại" });
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
      return res.render("login", { error: "Sai mật khẩu" });
    }

    req.session.user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role
    };

    if (user.role === "admin") {
      return res.redirect("/admin/dashboard");
    }

    if (user.role === "staff") {
      return res.redirect("/staff/dashboard");
    }

    // Nếu khách bị chuyển sang login từ bước checkout, quay lại giỏ hàng để tiếp tục đặt món
    if (req.session.redirectAfterLogin) {
      const redirectTo = req.session.redirectAfterLogin;
      req.session.redirectAfterLogin = null;
      return res.redirect(redirectTo);
    }

    return res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ── Đăng nhập Google (OAuth) ──
// Bắt đầu luồng đăng nhập: chuyển khách sang trang Google để xác thực.
router.get("/auth/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.render("login", { error: "Đăng nhập Google chưa được cấu hình. Vui lòng dùng email/mật khẩu." });
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});

// Google gọi lại đúng URL này sau khi khách xác nhận đồng ý ở phía Google.
router.get(
  "/auth/google/callback",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.redirect("/login");
    }
    passport.authenticate("google", { session: false, failureRedirect: "/login" })(req, res, next);
  },
  (req, res) => {
    const user = req.user;

    // Set session theo đúng cấu trúc hệ thống đang dùng (giống đăng nhập thường),
    // để mọi middleware isAdmin/isStaff và view hiện có hoạt động không cần sửa gì.
    req.session.user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      role: user.role
    };

    if (user.role === "admin") {
      return res.redirect("/admin/dashboard");
    }

    if (user.role === "staff") {
      return res.redirect("/staff/dashboard");
    }

    if (req.session.redirectAfterLogin) {
      const redirectTo = req.session.redirectAfterLogin;
      req.session.redirectAfterLogin = null;
      return res.redirect(redirectTo);
    }

    res.redirect("/");
  }
);

module.exports = router;