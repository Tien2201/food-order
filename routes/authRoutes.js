const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();
const User = require("../models/User");

router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

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

module.exports = router;