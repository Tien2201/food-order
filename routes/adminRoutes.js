const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");

const Food = require("../models/Food");
const Order = require("../models/Order");
const User = require("../models/User");

const upload = require("../config/upload");
const sendOTPEmail = require("../config/mailer");

const { isAdmin } = require("../middleware/auth");

router.get("/dashboard", isAdmin, async (req, res) => {
  const foodCount = await Food.countDocuments();
  const orderCount = await Order.countDocuments();
  const userCount = await User.countDocuments();

  // Tổng doanh thu
  const revenueData = await Order.aggregate([
    { $group: { _id: null, total: { $sum: "$totalPrice" } } }
  ]);
  const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

  // 5 đơn hàng mới nhất
  const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

  // Đơn hàng theo ngày - 7 ngày gần nhất
  const ordersByDay = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const count = await Order.countDocuments({ createdAt: { $gte: start, $lte: end } });
    ordersByDay.push(count);
  }

  res.render("admin/dashboard", {
    user: req.session.user,
    foodCount,
    orderCount,
    userCount,
    totalRevenue,
    recentOrders,
    ordersByDay
  });
});

router.get("/foods", isAdmin, async (req, res) => {
  const foods = await Food.find().sort({ createdAt: -1 });

  res.render("admin/foods", { foods, user: req.session.user });
});

router.post("/foods/add", isAdmin, upload.single("image"), async (req, res) => {

  const image = req.file
    ? "/uploads/foods/" + req.file.filename
    : "";

  await Food.create({
    name: req.body.name,
    price: req.body.price,
    description: req.body.description,
    image: image,
    category: req.body.category,
    status: true
  });

  res.redirect("/admin/foods");
});

router.get("/foods/edit/:id", isAdmin, async (req, res) => {
  const food = await Food.findById(req.params.id);

  res.render("admin/edit-food", { food, user: req.session.user });
});

router.post("/foods/edit/:id", isAdmin, upload.single("image"), async (req, res) => {
  const { name, price, description, status } = req.body;

  const updateData = {
    name,
    price,
    description,
    status: status === "true"
  };

  if (req.file) {
    updateData.image = "/uploads/foods/" + req.file.filename;
  }

  await Food.findByIdAndUpdate(req.params.id, updateData);

  res.redirect("/admin/foods");
});

router.post("/foods/delete/:id", isAdmin, async (req, res) => {
  await Food.findByIdAndDelete(req.params.id);

  res.redirect("/admin/foods");
});

router.get("/orders", isAdmin, async (req, res) => {
  const orders = await Order.find()
    .populate("confirmedBy", "fullname email")
    .sort({ createdAt: -1 });

  res.render("admin/orders", { orders, user: req.session.user });
});

router.get("/orders/edit/:id", isAdmin, async (req, res) => {
  const order = await Order.findById(req.params.id);

  res.render("admin/edit-order", { order, user: req.session.user });
});

router.post("/orders/edit/:id", isAdmin, async (req, res) => {
  const { customerName, phone, address, status, paymentCode } = req.body;

  await Order.findByIdAndUpdate(req.params.id, {
    customerName,
    phone,
    address,
    status,
    paymentCode
  });

  res.redirect("/admin/orders");
});

router.post("/orders/delete/:id", isAdmin, async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);

  res.redirect("/admin/orders");
});

router.get("/users", isAdmin, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.render("admin/users", { users, user: req.session.user });
});

router.post("/users/role/:id", isAdmin, async (req, res) => {
  const { role } = req.body;

  await User.findByIdAndUpdate(req.params.id, { role });

  res.redirect("/admin/users");
});

router.post("/users/password/request/:id", isAdmin, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.send("Bạn chưa nhập mật khẩu mới");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  req.session.changePassword = {
    userId: req.params.id,
    newPassword: password,
    otp,
    expires: Date.now() + 60 * 1000
  };

  await sendOTPEmail(process.env.ADMIN_EMAIL, otp);

  res.render("admin/verify-otp", {
    message: "Mã OTP đã được gửi về email Admin."
  });
});

router.post("/users/password/verify", isAdmin, async (req, res) => {
  const { otp } = req.body;
  const data = req.session.changePassword;

  if (!data) {
    return res.send("Không có yêu cầu đổi mật khẩu");
  }

  if (!data.newPassword) {
    return res.send("Không tìm thấy mật khẩu mới trong session");
  }

  if (Date.now() > data.expires) {
    req.session.changePassword = null;
    return res.send("OTP đã hết hạn");
  }

  if (otp !== data.otp) {
    return res.render("admin/verify-otp", {
      error: "Sai mã OTP"
    });
  }

  const hashPassword = await bcrypt.hash(data.newPassword, 10);

  await User.findByIdAndUpdate(data.userId, {
    password: hashPassword
  });

  req.session.changePassword = null;

  res.redirect("/admin/users");
});

router.get("/statistics", isAdmin, async (req, res) => {
  const totalOrders = await Order.countDocuments();

  const totalRevenueData = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalPrice" }
      }
    }
  ]);

  const foodStats = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.name",
        totalQuantity: { $sum: "$items.quantity" },
        totalMoney: {
          $sum: {
            $multiply: ["$items.quantity", "$items.price"]
          }
        }
      }
    },
    { $sort: { totalQuantity: -1 } }
  ]);

  const totalRevenue =
    totalRevenueData.length > 0 ? totalRevenueData[0].totalRevenue : 0;

  res.render("admin/statistics", { user: req.session.user,
    totalOrders,
    totalRevenue,
    foodStats
  });
});

module.exports = router;