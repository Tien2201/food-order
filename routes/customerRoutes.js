const express = require("express");
const router = express.Router();

const Food = require("../models/Food");
const Order = require("../models/Order");

router.get("/", async (req, res) => {

  const foods = await Food.find({
    status: true,
    category: "food"
  }).sort({ createdAt: -1 });

  const drinks = await Food.find({
    status: true,
    category: "drink"
  }).sort({ createdAt: -1 });

  res.render("index", {
    foods,
    drinks,
    user: req.session.user
  });

});

router.post("/cart/add/:id", async (req, res) => {
  const food = await Food.findById(req.params.id);

  const quantity = Number(req.body.quantity);
  const note = req.body.note;

  if (!req.session.cart) {
    req.session.cart = [];
  }

  req.session.cart.push({
    foodId: food._id,
    name: food.name,
    price: food.price,
    quantity,
    note
  });

  res.redirect("/cart");
});

router.get("/cart", (req, res) => {
  const cart = req.session.cart || [];

  const totalPrice = cart.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  res.render("cart", {
    cart,
    totalPrice,
    user: req.session.user
  });
});

router.post("/cart/remove/:index", (req, res) => {
  const index = parseInt(req.params.index);

  if (req.session.cart) {
    req.session.cart.splice(index, 1);
  }

  res.redirect("/cart");
});

router.post("/checkout", async (req, res) => {
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.redirect("/cart");
  }

  const totalPrice = cart.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const order = await Order.create({
    customerName: req.body.customerName,
    phone: req.body.phone,
    address: req.body.address,
    items: cart,
    totalPrice
  });

  if (!req.session.orderIds) {
    req.session.orderIds = [];
  }

  req.session.orderIds.push(order._id);

  req.session.cart = [];

  res.redirect("/order-success/" + order._id);
});

router.get("/order-success/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);

  res.render("order-success", {
    order,
    user: req.session.user
  });
});

router.get("/notifications", async (req, res) => {
  const orderIds = req.session.orderIds || [];

  const confirmedOrders = await Order.find({
    _id: { $in: orderIds },
    paymentCode: { $ne: "" }
  });

  res.json({
    count: confirmedOrders.length,
    orders: confirmedOrders
  });
});
const User = require("../models/User");

router.get("/about", (req, res) => {
  res.render("about", {
    user: req.session.user
  });
});

router.get("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const user = await User.findById(req.session.user._id);

  res.render("profile", {
    user
  });
});

router.post("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const { fullname, phone, address } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    req.session.user._id,
    {
      fullname,
      phone,
      address
    },
    { new: true }
  );

  req.session.user.fullname = updatedUser.fullname;

  res.redirect("/profile");
});
router.get("/profile", async (req, res) => {


if (!req.session.user) {
    return res.redirect("/login");
}

const user = await User.findById(
    req.session.user._id
);

res.render("profile", {
    user
});


});

router.post("/profile", async (req, res) => {


await User.findByIdAndUpdate(
    req.session.user._id,
    {
        fullname: req.body.fullname,
        phone: req.body.phone,
        address: req.body.address
    }
);

res.redirect("/profile");


});

module.exports = router;