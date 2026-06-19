// migrateOptionGroups.js
// Script gán sẵn `optionGroups` cho các món đã có trong DB, theo đúng map đã thống nhất.
// Chạy 1 lần: node migrateOptionGroups.js
// (Đặt file này vào thư mục gốc food_order, cùng cấp với server.js)

const mongoose = require("mongoose");
const Food = require("./models/Food");

// ⚠️ Sửa lại chuỗi kết nối MongoDB cho đúng với project của bạn
// (thường lấy từ file config/db.js hoặc file .env)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/food_order";

// Map: tên món (phải khớp đúng tên đang lưu trong DB) -> nhóm tùy chọn
const map = {
  "Đậu Hủ Thúi Truyền Thống":         { optionGroups: ["spice"] },
  "Đậu Hủ Thúi Nhục Thảo":            { optionGroups: ["spice"] },
  "Đậu Hủ Thúi Mắm Cá":               { optionGroups: ["spice"] },
  "Đậu Hủ Thúi Lắc Muối Tân Cương":   { optionGroups: ["spice"] },
  "Đậu Hủ Thúi Sốt Chao Thúi":        { optionGroups: ["spice"] },
  "Đậu Hủ Thúi Sốt Tương":            { optionGroups: ["spice"] },
  "Đậu Hủ Thúi Phỉ Thuý":             { optionGroups: ["spice", "cheese"] },
  "Đậu Hủ Thúi Phô Mai Mặn":          { optionGroups: ["cheese"] },
  "Đậu Hủ Thúi Sa Tế Khô Triều Châu": { optionGroups: ["beefFloss"] }
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Đã kết nối MongoDB.");

  let updated = 0;
  let notFound = [];

  for (const [name, data] of Object.entries(map)) {
    const result = await Food.updateOne({ name }, { $set: data });
    if (result.matchedCount > 0) {
      updated++;
      console.log(`✅ Đã cập nhật: ${name} ->`, data.optionGroups);
    } else {
      notFound.push(name);
    }
  }

  console.log(`\nTổng cộng cập nhật: ${updated}/${Object.keys(map).length} món.`);
  if (notFound.length > 0) {
    console.log("\n⚠️ Không tìm thấy món với tên sau (kiểm tra lại tên trong DB có khớp chính xác không):");
    notFound.forEach(n => console.log("   -", n));
  }

  await mongoose.disconnect();
  console.log("\nHoàn tất.");
}

run().catch(err => {
  console.error("Lỗi:", err);
  process.exit(1);
});