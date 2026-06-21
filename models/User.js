const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
fullname: {
type: String,
required: true
},


email: {
    type: String,
    required: true,
    unique: true
},

password: {
    type: String,
    required: function() {
        // Bắt buộc có password trừ khi tài khoản được tạo qua Google OAuth
        return !this.googleId;
    }
},

// ── Đăng nhập Google (OAuth) ──
// ID duy nhất Google trả về cho mỗi tài khoản. Nếu có giá trị này,
// tài khoản được tạo/đăng nhập qua Google, không cần password.
googleId: {
    type: String,
    default: null
},

phone: {
    type: String,
    default: ""
},

address: {
    type: String,
    default: ""
},

avatar: {
    type: String,
    default: "/images/default-avatar.png"
},

role: {
    type: String,
    enum: ["admin", "staff", "customer"],
    default: "customer"
}


},
{
timestamps: true

});

module.exports = mongoose.model("User", userSchema);