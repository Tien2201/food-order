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

  // ── Danh sách gia vị/thành phần của món (admin tự thêm, mỗi món khác nhau) ──
  // Khách sẽ thấy mỗi gia vị thành 1 tùy chọn "Không [gia vị]" trong popup thêm vào giỏ.
  // Ví dụ: ["Hành", "Cần tàu", "Tỏi phi", "Ớt tươi"]
  ingredients: {
    type: [String],
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

// ── Index để tăng tốc truy vấn khi số lượng món lớn ──
// category + status: trang chủ luôn lọc theo cả 2 field này cùng lúc
foodSchema.index({ category: 1, status: 1 });
// soldCount: tìm món bán chạy nhất (bestSeller)
foodSchema.index({ soldCount: -1 });
// avgRating: tìm món đánh giá cao nhất (topRated)
foodSchema.index({ avgRating: -1 });

module.exports = mongoose.model("Food", foodSchema);