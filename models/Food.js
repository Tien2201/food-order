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

  // ── Độ cay ──
  spiceLevel: {
    type: String,
    enum: ["spicy", "non-spicy"],
    default: "non-spicy"
  },

  // ── Loại nước: soup hoặc khô ──
  soupType: {
    type: String,
    enum: ["soup", "dry"],
    default: "dry"
  },

  // ── Nhóm tùy chọn hiện trong popup khi khách thêm vào giỏ ──
  // spice: Cay/Không cay (ớt)
  // cheese: Có/Không muối Đài Loan + rau quế
  // beefFloss: Có/Không khô cá bào
  // (Soup chung/riêng tự hiện riêng dựa theo soupType, không cần khai báo ở đây)
  optionGroups: {
    type: [String],
    enum: ["spice", "cheese", "beefFloss"],
    default: []
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