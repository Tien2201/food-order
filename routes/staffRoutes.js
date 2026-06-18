const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const Food = require("../models/Food");
const { isStaff } = require("../middleware/auth");

// ── Dashboard ──
router.get("/dashboard", isStaff, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const confirmedOrders = await Order.countDocuments({ status: { $ne: "pending" } });

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

// ── Bước 1: Xác nhận đơn -> chuyển sang "confirmed", khách sẽ thấy QR để thanh toán ──
router.post("/orders/confirm/:id", isStaff, async (req, res) => {
  try {
    const paymentCode = "PAY" + Date.now();
    await Order.findByIdAndUpdate(req.params.id, {
      status: "confirmed",
      paymentCode,
      confirmedBy: req.session.user._id
    });

    res.redirect("/staff/orders");
  } catch (err) {
    console.error(err);
    res.redirect("/staff/orders");
  }
});

// ── Bước 2: Xác minh ảnh thanh toán khách gửi -> chuyển sang "preparing", bắt đầu làm món ──
router.post("/orders/verify-payment/:id", isStaff, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "preparing",
        paymentVerifiedBy: req.session.user._id
      },
      { new: true }
    );

    // Cộng số lượng đã bán cho từng món (chỉ tính khi thanh toán đã được xác minh)
    if (order && order.items) {
      for (const item of order.items) {
        if (item.foodId) {
          await Food.findByIdAndUpdate(item.foodId, { $inc: { soldCount: item.quantity } });
        }
      }
    }

    res.redirect("/staff/orders/" + req.params.id);
  } catch (err) {
    console.error(err);
    res.redirect("/staff/orders");
  }
});

// ── Thông báo đơn mới (status = pending, chưa xác nhận) ──
router.get("/notifications", isStaff, async (req, res) => {
  try {
    const newOrders = await Order.find({ status: "pending" });
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