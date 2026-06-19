// migrateIngredients.js
// Script gán sẵn danh sách gia vị (`ingredients`) cho các món đã có trong DB,
// theo đúng map đã thống nhất với người dùng.
// Chạy 1 lần: node migrateIngredients.js
// (Đặt file này vào thư mục gốc food_order, cùng cấp với server.js)

const mongoose = require("mongoose");
const Food = require("./models/Food");

// ⚠️ Sửa lại chuỗi kết nối MongoDB cho đúng với project của bạn
// (thường lấy từ file config/db.js hoặc file .env)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/food_order";

// Map: tên món (phải khớp đúng tên đang lưu trong DB) -> danh sách gia vị
const map = {
  "Đậu Hủ Thúi Phô Mai Mặn":
    { ingredients: ["Muối Đài Loan", "Rau quế"] },

  "Đậu Hủ Thúi Phỉ Thuý":
    { ingredients: ["Muối Đài Loan", "Rau quế"] },

  "Đậu Hủ Thúi Sa Tế Khô Triều Châu":
    { ingredients: ["Khô cá bào"] },

  "Đậu Hủ Thúi Lắc Muối Tân Cương":
    { ingredients: ["Hành", "Cần tàu", "Tỏi phi", "Ớt tươi"] },

  "Đậu Hủ Thúi Sốt Chao Thúi":
    { ingredients: ["Hành", "Cần tàu", "Tỏi phi", "Ớt tươi"] },

  "Đậu Hủ Thúi Sốt Tương":
    { ingredients: ["Hành", "Cần tàu", "Tỏi phi", "Ớt tươi"] },

  "Đậu Hủ Thúi Truyền Thống":
    { ingredients: ["Hành", "Cần tàu", "Tỏi phi", "Dầu ớt", "Củ cải dền"] },

  "Đậu Hủ Thúi Nhục Thảo":
    { ingredients: ["Hành", "Ớt tươi", "Đậu hủ ky", "Trứng bắc thảo"] },

  "Đậu Hủ Thúi Mắm Cá":
    { ingredients: ["Cần", "Bắp", "Rong biển", "Ớt tươi", "Củ cải dền"] }
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
      console.log(`✅ Đã cập nhật: ${name} ->`, data.ingredients.join(", "));
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