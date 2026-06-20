const express = require("express");
const router = express.Router();

const Food = require("../models/Food");
const Order = require("../models/Order");
const User = require("../models/User");
const Review = require("../models/Review");
const Setting = require("../models/Setting");
const upload = require("../config/upload");
const mongoose = require("mongoose");

// ── Trang chủ / Menu ──
router.get("/", async (req, res) => {
  try {
    const foods = await Food.find({ status: true, category: "food" }).sort({ createdAt: -1 });
    const drinks = await Food.find({ status: true, category: "drink" }).sort({ createdAt: -1 });

    // 3 món nổi bật cho slideshow: bán chạy nhất / mới nhất / đánh giá cao nhất
    const bestSeller = await Food.findOne({ status: true }).sort({ soldCount: -1 }).lean();
    const newest = await Food.findOne({ status: true }).sort({ createdAt: -1 }).lean();
    const topRated = await Food.findOne({ status: true, ratingCount: { $gt: 0 } })
      .sort({ avgRating: -1, ratingCount: -1 })
      .lean();

    const featuredMap = new Map();
    if (bestSeller) featuredMap.set(String(bestSeller._id), { ...bestSeller, badge: "🔥 Bán chạy nhất" });
    if (newest && !featuredMap.has(String(newest._id))) featuredMap.set(String(newest._id), { ...newest, badge: "✨ Món mới" });
    if (topRated && !featuredMap.has(String(topRated._id))) featuredMap.set(String(topRated._id), { ...topRated, badge: "⭐ Được khen nhiều" });

    const featuredFoods = Array.from(featuredMap.values());

    res.render("index", {
      foods,
      drinks,
      featuredFoods,
      user: req.session.user || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});

// ── Giới thiệu ──
router.get("/about", async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "general" });
    res.render("about", { user: req.session.user || null, setting });
  } catch (err) {
    console.error(err);
    res.render("about", { user: req.session.user || null, setting: null });
  }
});

// ── Thêm vào giỏ hàng ──
router.post("/cart/add/:id", async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) {
      if (req.headers["x-requested-with"] === "XMLHttpRequest" || req.headers.accept?.includes("application/json")) {
        return res.status(404).json({ success: false, message: "Không tìm thấy món ăn" });
      }
      return res.redirect("/");
    }

    if (!req.session.cart) req.session.cart = [];

    req.session.cart.push({
      foodId: food._id,
      name: food.name,
      price: food.price,
      image: food.image,
      category: food.category,
      quantity: Number(req.body.quantity) || 1,
      note: req.body.note || ""
    });

    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);

    // Yêu cầu AJAX (fetch từ popup chọn món) -> trả JSON, không chuyển trang
    if (req.headers["x-requested-with"] === "XMLHttpRequest" || req.headers.accept?.includes("application/json")) {
      return res.json({ success: true, cartCount });
    }

    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    if (req.headers["x-requested-with"] === "XMLHttpRequest" || req.headers.accept?.includes("application/json")) {
      return res.status(500).json({ success: false, message: "Lỗi server" });
    }
    res.redirect("/");
  }
});

// ── Xem giỏ hàng ──
router.get("/cart", (req, res) => {
  const cart = req.session.cart || [];
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.render("cart", { cart, totalPrice, user: req.session.user || null });
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
// Cho phép khách vãng lai đặt món không cần đăng nhập.
// Nếu khách đã đăng nhập, vẫn lưu placedBy để theo dõi qua /my-orders.
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
      totalPrice,
      placedBy: req.session.user ? req.session.user._id : null
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

    const setting = await Setting.findOne({ key: "general" });

    res.render("order-success", {
      order,
      user: req.session.user || null,
      qrImage: setting ? setting.paymentQrImage : ""
    });
  } catch (err) {
    res.redirect("/");
  }
});

// ── Kiểm tra trạng thái đơn hàng (dùng cho polling tự động trên trang order-success) ──
router.get("/order-status/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.json({ status: null });

    res.json({
      status: order.status,
      paymentProofImage: order.paymentProofImage || ""
    });
  } catch (err) {
    res.json({ status: null });
  }
});

// ── Khách upload ảnh chứng minh đã chuyển khoản ──
router.post("/order-payment-proof/:id", upload.uploadPaymentProof.single("paymentProof"), async (req, res) => {
  try {
    if (req.file) {
      await Order.findByIdAndUpdate(req.params.id, {
        paymentProofImage: req.file.path,
        status: "payment_submitted"
      });
    }
    res.redirect("/order-success/" + req.params.id);
  } catch (err) {
    console.error("LỖI UPLOAD ẢNH THANH TOÁN:", err.message);
    console.error(err);
    res.status(500).send("Lỗi khi gửi ảnh thanh toán: " + err.message);
  }
});

// ── Thông báo đơn hàng đã xác nhận ──
// ── Thông báo toast cho khách: đơn được xác nhận / thanh toán hợp lệ ──
// Theo dõi 2 cột mốc quan trọng khách cần biết ngay:
//   - "confirmed": nhân viên đã xác nhận đơn, QR thanh toán đã sẵn sàng
//   - "preparing": nhân viên đã xác minh thanh toán hợp lệ, đơn đang được làm
// req.session.notifiedStatuses lưu lại trạng thái đã từng báo cho từng đơn,
// để không hiện lại toast cũ mỗi lần polling.
router.get("/notifications", async (req, res) => {
  try {
    const orderIds = req.session.orderIds || [];
    if (!req.session.notifiedStatuses) req.session.notifiedStatuses = {};

    const watchedStatuses = ["confirmed", "preparing"];
    const orders = await Order.find({
      _id: { $in: orderIds },
      status: { $in: watchedStatuses }
    });

    const toastMessages = {
      confirmed: "✅ Đơn hàng của bạn đã được xác nhận! Vào kiểm tra mã QR để thanh toán.",
      preparing: "🎉 Thanh toán hợp lệ! Đơn của bạn đang được chuẩn bị."
    };

    const newNotifications = [];
    orders.forEach(order => {
      const orderIdStr = String(order._id);
      const lastNotified = req.session.notifiedStatuses[orderIdStr];

      // Chỉ báo nếu trạng thái này CHƯA từng được báo cho đơn này
      if (lastNotified !== order.status) {
        newNotifications.push({
          orderId: order._id,
          status: order.status,
          message: toastMessages[order.status]
        });
        req.session.notifiedStatuses[orderIdStr] = order.status;
      }
    });

    // Vẫn giữ "count" cũ (dùng cho chuông thông báo ở trang chủ) để không phá vỡ chỗ đang dùng
    const confirmedOrders = await Order.find({
      _id: { $in: orderIds },
      paymentCode: { $ne: "" }
    });

    res.json({
      count: confirmedOrders.length,
      orders: confirmedOrders,
      toasts: newNotifications
    });
  } catch (err) {
    res.json({ count: 0, orders: [], toasts: [] });
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

router.post("/profile", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  try {
    const { fullname, phone, address } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user._id,
      { fullname, phone, address },
      { new: true }
    );
    req.session.user.fullname = updatedUser.fullname;
    req.session.user.phone = updatedUser.phone;
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.redirect("/profile");
  }
});

// ── Lịch sử đơn hàng của tôi (để đánh giá món) ──
router.get("/my-orders", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    // Ưu tiên tìm theo placedBy (chính xác). Một số đơn cũ trước khi có
    // trường này được tạo chỉ có phone, nên gộp thêm điều kiện phone để
    // không bỏ sót đơn hàng cũ của khách.
    const orConditions = [{ placedBy: req.session.user._id }];
    if (req.session.user.phone) {
      orConditions.push({ phone: req.session.user.phone });
    }

    const orders = await Order.find({ $or: orConditions }).sort({ createdAt: -1 });

    const reviews = await Review.find({ user: req.session.user._id });
    const reviewedKeys = reviews.map(r => `${r.order}_${r.food}`);

    res.render("my-orders", {
      orders,
      reviewedKeys,
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ── Trạng thái mới nhất của các đơn khách (dùng cho polling tự cập nhật) ──
// Dùng đúng điều kiện tìm kiếm như route /my-orders để không lộ đơn của người khác.
router.get("/my-orders/status", async (req, res) => {
  if (!req.session.user) return res.json({ orders: [] });

  try {
    const orConditions = [{ placedBy: req.session.user._id }];
    if (req.session.user.phone) {
      orConditions.push({ phone: req.session.user.phone });
    }

    const orders = await Order.find({ $or: orConditions }).select("status paymentCode");
    res.json({
      orders: orders.map(o => ({ id: o._id, status: o.status }))
    });
  } catch (err) {
    res.json({ orders: [] });
  }
});

// ── Tra cứu đơn hàng (dành cho khách KHÔNG đăng nhập, tìm theo SĐT) ──
router.get("/track-order", (req, res) => {
  res.render("track-order", {
    orders: null,
    phone: "",
    user: req.session.user || null
  });
});

router.post("/track-order", async (req, res) => {
  try {
    const phone = (req.body.phone || "").trim();

    if (!phone) {
      return res.render("track-order", {
        orders: null,
        phone: "",
        user: req.session.user || null
      });
    }

    const orders = await Order.find({ phone }).sort({ createdAt: -1 });

    res.render("track-order", {
      orders,
      phone,
      user: req.session.user || null
    });
  } catch (err) {
    console.error(err);
    res.render("track-order", {
      orders: null,
      phone: "",
      user: req.session.user || null
    });
  }
});

// ── Gửi đánh giá cho 1 món trong 1 đơn hàng cụ thể ──
router.post("/review/:orderId/:foodId", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  try {
    const { orderId, foodId } = req.params;
    const rating = Number(req.body.rating);
    const comment = req.body.comment || "";

    if (!rating || rating < 1 || rating > 5) {
      return res.redirect("/my-orders");
    }

    const order = await Order.findById(orderId);
    const isOwner = order && (
      (order.placedBy && String(order.placedBy) === String(req.session.user._id)) ||
      (!order.placedBy && order.phone === req.session.user.phone)
    );
    if (!order || !isOwner || !order.paymentCode) {
      return res.redirect("/my-orders");
    }

    await Review.create({
      food: foodId,
      order: orderId,
      user: req.session.user._id,
      rating,
      comment
    });

    const stats = await Review.aggregate([
      { $match: { food: new mongoose.Types.ObjectId(foodId) } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);

    if (stats.length > 0) {
      await Food.findByIdAndUpdate(foodId, {
        avgRating: Math.round(stats[0].avg * 10) / 10,
        ratingCount: stats[0].count
      });
    }

    res.redirect("/my-orders");
  } catch (err) {
    console.error(err);
    res.redirect("/my-orders");
  }
});

module.exports = router;