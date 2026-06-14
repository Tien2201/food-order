const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerName: String,
  phone: String,
  address: String,

  items: [
    {
      foodId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Food"
      },
      name: String,
      price: Number,
      quantity: Number,
      note: String
    }
  ],

  totalPrice: Number,

  status: {
    type: String,
    enum: [
      "Chờ nhân viên xác nhận",
      "Đã xác nhận",
      "Đang làm món",
      "Đang giao hàng",
      "Hoàn thành",
      "Đã hủy"
    ],
    default: "Chờ nhân viên xác nhận"
  },

  paymentCode: {
    type: String,
    default: ""
  },

  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  autoDeleteAt: {
    type: Date,
    default: () =>
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);