// migrateUsernames.js
// Gán username mặc định cho các tài khoản cũ (Admin, Staff, khách đã đăng ký
// trước đây) chưa có username — cần chạy 1 lần sau khi thêm field username
// bắt buộc vào model User.
// Cách đặt: lấy phần trước "@" của email, viết liền không dấu cách.
// Nếu trùng với username đã có, tự thêm số ở cuối (vd: minhanh, minhanh2...).
// Chạy: node migrateUsernames.js

const mongoose = require("mongoose");
const User = require("./models/User");

// ⚠️ Sửa lại chuỗi kết nối MongoDB cho đúng với project của bạn
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/food_order";

function slugifyEmailPrefix(email) {
  const prefix = email.split("@")[0] || "user";
  // Bỏ ký tự không hợp lệ theo đúng rule của route đăng ký (chỉ chữ/số/_/.)
  return prefix.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase() || "user";
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Đã kết nối MongoDB.");

  // Chỉ lấy tài khoản chưa có username VÀ không phải tài khoản Google
  // (tài khoản Google được phép không có username, không cần xử lý)
  const usersWithoutUsername = await User.find({
    $or: [{ username: { $exists: false } }, { username: null }],
    googleId: { $in: [null, undefined] }
  });

  console.log(`Tìm thấy ${usersWithoutUsername.length} tài khoản cần gán username.`);

  let updated = 0;

  for (const user of usersWithoutUsername) {
    let baseUsername = slugifyEmailPrefix(user.email);
    let candidate = baseUsername;
    let suffix = 1;

    // Kiểm tra trùng, thêm số ở cuối nếu cần
    while (await User.findOne({ username: candidate })) {
      suffix++;
      candidate = `${baseUsername}${suffix}`;
    }

    user.username = candidate;
    await user.save();

    console.log(`✅ ${user.email} -> username: ${candidate}`);
    updated++;
  }

  console.log(`\nTổng cộng đã gán username cho ${updated} tài khoản.`);
  console.log("Lưu ý: thông báo cho các tài khoản này (đặc biệt Admin/Staff)");
  console.log("biết username mới được gán, để họ dùng khi đăng nhập lần sau.");

  await mongoose.disconnect();
  console.log("\nHoàn tất.");
}

run().catch(err => {
  console.error("Lỗi:", err);
  process.exit(1);
});