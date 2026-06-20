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
// ── Thông báo cho nhân viên: đơn mới + đơn vừa đổi trạng thái ──
// Trang danh sách gửi lên "knownStatuses" (orderId:status hiện đang hiển thị)
// để server so sánh và báo lại nếu có đơn nào đã đổi trạng thái (ví dụ khách
// vừa gửi ảnh thanh toán: confirmed -> payment_submitted) mà trang chưa biết.
router.get("/notifications", isStaff, async (req, res) => {
  try {
    const newOrders = await Order.find({ status: "pending" });

    let hasChangedOrders = false;
    if (req.query.knownStatuses) {
      let knownMap = {};
      try {
        knownMap = JSON.parse(req.query.knownStatuses);
      } catch (e) {
        knownMap = {};
      }

      const allOrders = await Order.find().select("status");
      for (const order of allOrders) {
        const orderIdStr = String(order._id);
        if (knownMap[orderIdStr] !== undefined && knownMap[orderIdStr] !== order.status) {
          hasChangedOrders = true;
          break;
        }
      }
    }

    res.json({ count: newOrders.length, orders: newOrders, hasChangedOrders });
  } catch (err) {
    res.json({ count: 0, orders: [], hasChangedOrders: false });
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

// ── Kiểm tra trạng thái 1 đơn (dùng cho polling tự động ở trang chi tiết đơn) ──
router.get("/orders/:id/status", isStaff, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select("status paymentProofImage");
    if (!order) return res.json({ status: null });
    res.json({
      status: order.status,
      hasPaymentProof: !!order.paymentProofImage
    });
  } catch (err) {
    res.json({ status: null });
  }
});

// ── Xóa 1 đơn hàng ──
// Không giới hạn trạng thái — theo yêu cầu, cho phép xóa đơn ở bất kỳ
// trạng thái nào. CẢNH BÁO: hành động này không thể hoàn tác, có thể
// xóa mất đơn đang được xử lý nếu bấm nhầm.
router.post("/orders/delete/:id", isStaff, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi khi xóa đơn hàng" });
  }
});

module.exports = router;