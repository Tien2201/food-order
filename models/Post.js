const mongoose = require("mongoose");

// Bài đăng thảo luận/feedback công khai - khách đã đăng nhập có thể đăng
// kèm ảnh, không cần gắn với món cụ thể hay đơn hàng nào. Admin phải duyệt
// (status: "approved") trước khi bài hiện công khai cho mọi người xem.
const postSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  content: {
    type: String,
    required: true,
    trim: true
  },

  // Tối đa 4 ảnh mỗi bài (giới hạn được kiểm tra ở route, không chỉ ở đây)
  images: {
    type: [String],
    default: []
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  // Admin nào đã duyệt/từ chối bài này (nếu có)
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }

}, {
  timestamps: true
});

// Trang công khai luôn lọc theo status="approved" và sort theo thời gian mới nhất
postSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);