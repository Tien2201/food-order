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
    const { fullname, username, email, password, confirmPassword } = req.body;

    // Validate phía server — không chỉ dựa vào JS phía client, vì JS có thể
    // bị tắt hoặc bị bỏ qua khi gửi request trực tiếp.
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.render("register", { error: "Mật khẩu nhập lại không khớp" });
    }

    if (!password || password.length < 6) {
      return res.render("register", { error: "Mật khẩu cần tối thiểu 6 ký tự" });
    }

    const cleanUsername = (username || "").trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      return res.render("register", { error: "Tên đăng nhập cần tối thiểu 3 ký tự" });
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      return res.render("register", { error: "Tên đăng nhập chỉ gồm chữ, số, gạch dưới (_) hoặc chấm (.), không khoảng trắng" });
    }

    const checkEmail = await User.findOne({ email });
    if (checkEmail) {
      return res.render("register", { error: "Email đã tồn tại" });
    }

    const checkUsername = await User.findOne({ username: cleanUsername });
    if (checkUsername) {
      return res.render("register", { error: "Tên đăng nhập đã được sử dụng" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullname,
      username: cleanUsername,
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
    const { loginId, password } = req.body;
    const cleanLoginId = (loginId || "").trim();

    // Tự nhận diện: nếu có "@" thì coi là email, ngược lại coi là username.
    // Tìm theo đúng field tương ứng để chính xác hơn so với việc $or cả 2 field.
    const query = cleanLoginId.includes("@")
      ? { email: cleanLoginId }
      : { username: cleanLoginId };

    const user = await User.findOne(query);

    if (!user) {
      return res.render("login", { error: "Tài khoản không tồn tại" });
    }

    if (!user.password) {
      return res.render("login", { error: "Tài khoản này đăng nhập bằng Google, vui lòng dùng nút Đăng nhập với Google" });
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
      return res.render("login", { error: "Sai mật khẩu" });
    }

    req.session.user = {
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar
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
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar
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