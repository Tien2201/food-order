const express = require("express");
const router = express.Router();

const Food = require("../models/Food");
const Order = require("../models/Order");
const User = require("../models/User");

// ── Trang chủ / Menu ──
router.get("/", async (req, res) => {
  try {
    const foods = await Food.find({ status: true, category: "food" }).sort({ createdAt: -1 });
    const drinks = await Food.find({ status: true, category: "drink" }).sort({ createdAt: -1 });

    res.render("index", {
      foods,
      drinks,
      user: req.session.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});

// ── Giới thiệu ──
router.get("/about", (req, res) => {
  res.render("about", { user: req.session.user || null });
});

// ── Thêm vào giỏ hàng ──
// FIX: lưu thêm food.image để hiện ảnh trong trang cart
router.post("/cart/add/:id", async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) return res.redirect("/");

    if (!req.session.cart) req.session.cart = [];

    req.session.cart.push({
      foodId: food._id,
      name: food.name,
      price: food.price,
      image: food.image,         // ← FIX: thêm image
      category: food.category,
      quantity: Number(req.body.quantity) || 1,
      note: req.body.note || ""
    });

    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ── Xem giỏ hàng ──
router.get("/cart", (req, res) => {
  const cart = req.session.cart || [];

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.render("cart", {
    cart,
    totalPrice,
    user: req.session.user || null
  });
});

// ── Xóa món khỏi giỏ ──
router.post("/cart/remove/:index", (req, res) => {
  const index = parseInt(req.params.index);

  if (req.session.cart && index >= 0 && index < req.session.cart.length) {
    req.session.cart.splice(index, 1);
  }

  res.redirect("/cart");
});

// ── Đặt hàng / Checkout ──
router.post("/checkout", async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (cart.length === 0) return res.redirect("/cart");

    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await Order.create({
      customerName: req.body.customerName,
      phone: req.body.phone,
      address: req.body.address,
      items: cart,
      totalPrice
    });

    if (!req.session.orderIds) req.session.orderIds = [];
    req.session.orderIds.push(order._id);

    req.session.cart = [];

    res.redirect("/order-success/" + order._id);
  } catch (err) {
    console.error(err);
    res.redirect("/cart");
  }
});

// ── Trang đặt hàng thành công ──
router.get("/order-success/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.redirect("/");

    res.render("order-success", {
      order,
      user: req.session.user || null
    });
  } catch (err) {
    res.redirect("/");
  }
});

// ── Thông báo đơn hàng đã xác nhận (polling mỗi 5s từ client) ──
router.get("/notifications", async (req, res) => {
  try {
    const orderIds = req.session.orderIds || [];

    const confirmedOrders = await Order.find({
      _id: { $in: orderIds },
      paymentCode: { $ne: "" }
    });

    res.json({ count: confirmedOrders.length, orders: confirmedOrders });
  } catch (err) {
    res.json({ count: 0, orders: [] });
  }
});

// ── Trang cá nhân ──
router.get("/profile", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const user = await User.findById(req.session.user._id);
    res.render("profile", { user });
  } catch (err) {
    res.redirect("/");
  }
});

// FIX: chỉ giữ 1 route POST /profile (bỏ route trùng cũ)
router.post("/profile", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const { fullname, phone, address } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user._id,
      { fullname, phone, address },
      { new: true }
    );

    // Cập nhật session để header hiện tên mới
    req.session.user.fullname = updatedUser.fullname;
    req.session.user.phone = updatedUser.phone;

    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.redirect("/profile");
  }
});

module.exports = router;