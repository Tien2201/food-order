const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const { isStaff } = require("../middleware/auth");

router.get("/orders", isStaff, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });

  res.render("staff/orders", {
    orders,
    user: req.session.user
  });
});

router.post("/orders/confirm/:id", isStaff, async (req, res) => {
  const paymentCode = "PAY" + Date.now();

  await Order.findByIdAndUpdate(req.params.id, {
    status: "Đã xác nhận",
    paymentCode: paymentCode,
    confirmedBy: req.session.user._id
  });

  res.redirect("/staff/orders");
});
router.get("/notifications", isStaff, async (req, res) => {
  const newOrders = await Order.find({
    paymentCode: ""
  });

  res.json({
    count: newOrders.length,
    orders: newOrders
  });
});
router.get("/orders/:id", isStaff, async (req, res) => {
  const order = await Order.findById(req.params.id);

  res.render("staff/order-detail", {
    order,
    user: req.session.user
  });
});
module.exports = router;