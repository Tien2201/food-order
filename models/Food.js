const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  description: {
    type: String
  },

  image: {
    type: String,
    default: "https://via.placeholder.com/300x200"
  },

  category: {
    type: String,
    enum: ["food", "drink"],
    default: "food"
  },

  status: {
    type: Boolean,
    default: true
  },

  // ── Đánh giá sao ──
  avgRating: {
    type: Number,
    default: 0
  },

  ratingCount: {
    type: Number,
    default: 0
  },

  // ── Số lượng đã bán (để xác định món bán chạy nhất) ──
  soldCount: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Food", foodSchema);