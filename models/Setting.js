const mongoose = require("mongoose");

// Collection này chỉ nên có đúng 1 document duy nhất (key cố định "general")
// để lưu các cấu hình chung của hệ thống, hiện tại dùng cho ảnh QR thanh toán.
const settingSchema = new mongoose.Schema({

  key: {
    type: String,
    default: "general",
    unique: true
  },

  paymentQrImage: {
    type: String,
    default: ""
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Setting", settingSchema);