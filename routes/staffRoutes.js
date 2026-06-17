const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const { isStaff } = require("../middleware/auth");

// ── Dashboard ──
router.get("/dashboard", isStaff, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ paymentCode: "" });
    const confirmedOrders = await Order.countDocuments({ paymentCode: { $ne: "" } });

    // Đơn hàng nhân viên này đã xác nhận
    const myConfirmedCount = await Order.countDocuments({ confirmedBy: req.session.user._id });

    // 5 đơn mới nhất
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

    res.render("staff/dashboard", {
      user: req.session.user,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      myConfirmedCount,
      recentOrders
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});

// ── Danh sách đơn hàng ──
router.get("/orders", isStaff, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.render("staff/orders", { orders, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});

// ── Xác nhận đơn ──
router.post("/orders/confirm/:id", isStaff, async (req, res) => {
  try {
    const paymentCode = "PAY" + Date.now();
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: "Đã xác nhận",
      paymentCode,
      confirmedBy: req.session.user._id
    });

    // Cộng số lượng đã bán cho từng món trong đơn (dùng để xác định món bán chạy nhất)
    if (order && order.items) {
      const Food = require("../models/Food");
      for (const item of order.items) {
        if (item.foodId) {
          await Food.findByIdAndUpdate(item.foodId, { $inc: { soldCount: item.quantity } });
        }
      }
    }

    res.redirect("/staff/orders");
  } catch (err) {
    res.redirect("/staff/orders");
  }
});

// ── Thông báo đơn mới ──
router.get("/notifications", isStaff, async (req, res) => {
  try {
    const newOrders = await Order.find({ paymentCode: "" });
    res.json({ count: newOrders.length, orders: newOrders });
  } catch (err) {
    res.json({ count: 0, orders: [] });
  }
});

// ── Chi tiết đơn ──
router.get("/orders/:id", isStaff, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    res.render("staff/order-detail", { order, user: req.session.user });
  } catch (err) {
    res.redirect("/staff/orders");
  }
});

module.exports = router;