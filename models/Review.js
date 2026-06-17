const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({

  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Food",
    required: true
  },

  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  comment: {
    type: String,
    default: ""
  }

}, {
  timestamps: true
});

// Mỗi user chỉ đánh giá 1 món trong 1 đơn hàng cụ thể 1 lần
reviewSchema.index({ food: 1, order: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);