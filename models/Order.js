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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);