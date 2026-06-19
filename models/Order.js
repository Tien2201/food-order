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
        "pending",            // chờ nhân viên xác nhận
        "confirmed",          // đã xác nhận, đang chờ khách thanh toán (QR đã hiện cho khách)
        "payment_submitted",  // khách đã upload ảnh chuyển khoản, chờ nhân viên xác minh
        "preparing",          // nhân viên đã xác minh thanh toán, đang làm món
        "delivering",
        "completed",
        "cancelled"
    ],

    default: "pending"
},

paymentCode: {
    type: String,
    default: ""
},

// Ảnh chứng minh chuyển khoản do khách tự upload
paymentProofImage: {
    type: String,
    default: ""
},

placedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
},

confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
},

// Nhân viên xác minh thanh toán hợp lệ (có thể khác người đã confirm đơn ban đầu)
paymentVerifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
}


}, {
timestamps: true
});

// ── Index để tăng tốc truy vấn khi số lượng đơn hàng lớn ──
// phone: dùng trong /track-order, /my-orders (khách cũ tra theo SĐT)
orderSchema.index({ phone: 1 });
// placedBy: dùng trong /my-orders (khách đã đăng nhập)
orderSchema.index({ placedBy: 1 });
// status: admin/staff lọc đơn theo trạng thái (pending, confirmed...)
orderSchema.index({ status: 1 });
// createdAt: gần như mọi trang đều sort theo thời gian mới nhất
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);