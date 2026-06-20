const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");

const Food = require("../models/Food");
const Order = require("../models/Order");
const User = require("../models/User");
const Setting = require("../models/Setting");

const upload = require("../config/upload");
const cloudinary = require("../config/cloudinary");
const sendOTPEmail = require("../config/mailer");

const { isAdmin } = require("../middleware/auth");

// Xóa ảnh trên Cloudinary nếu đường dẫn là ảnh do hệ thống upload lên đó
// (an toàn: không xóa nhầm ảnh mặc định /images/background.jpg hoặc URL khác)
async function deleteCloudinaryImage(imagePath) {
  if (!imagePath || !imagePath.includes("res.cloudinary.com")) return;

  try {
    // Trích public_id từ URL Cloudinary, ví dụ:
    // https://res.cloudinary.com/xxx/image/upload/v123/food-order/foods/tramnhang.jpg
    // -> public_id cần xóa là: food-order/foods/tramnhang
    const parts = imagePath.split("/upload/")[1]; // v123/food-order/foods/tramnhang.jpg
    const withoutVersion = parts.split("/").slice(1).join("/"); // food-order/foods/tramnhang.jpg
    const publicId = withoutVersion.replace(/\.[a-zA-Z0-9]+$/, ""); // bỏ phần mở rộng .jpg

    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Không xóa được ảnh trên Cloudinary:", err.message);
  }
}

const deleteFoodImage = deleteCloudinaryImage;


router.get("/dashboard", isAdmin, async (req, res) => {
  const foodCount = await Food.countDocuments();
  const orderCount = await Order.countDocuments();
  const userCount = await User.countDocuments();

  // Tổng doanh thu
  const revenueData = await Order.aggregate([
    { $group: { _id: null, total: { $sum: "$totalPrice" } } }
  ]);
  const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

  // 5 đơn hàng mới nhất
  const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);

  // Đơn hàng theo ngày - 7 ngày gần nhất
  const ordersByDay = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const count = await Order.countDocuments({ createdAt: { $gte: start, $lte: end } });
    ordersByDay.push(count);
  }

  res.render("admin/dashboard", {
    user: req.session.user,
    foodCount,
    orderCount,
    userCount,
    totalRevenue,
    recentOrders,
    ordersByDay
  });
});

// ── Quản lý ảnh QR thanh toán ──
router.get("/settings/qr", isAdmin, async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: "general" });
    if (!setting) setting = await Setting.create({ key: "general" });

    res.render("admin/settings-qr", { setting, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/dashboard");
  }
});

router.post("/settings/qr", isAdmin, upload.uploadQr.single("qrImage"), async (req, res) => {
  try {
    if (req.file) {
      await Setting.findOneAndUpdate(
        { key: "general" },
        { paymentQrImage: req.file.path },
        { upsert: true }
      );
    }
    res.redirect("/admin/settings/qr");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/settings/qr");
  }
});

router.get("/foods", isAdmin, async (req, res) => {
  const foods = await Food.find().sort({ createdAt: -1 });

  res.render("admin/foods", { foods, user: req.session.user });
});

router.post("/foods/add", isAdmin, upload.single("image"), async (req, res) => {
  try {
    // req.file.path là URL đầy đủ trên Cloudinary (vd: https://res.cloudinary.com/...)
    const image = req.file ? req.file.path : "";

    // Hidden input "ingredients" có thể trả về: undefined (chưa thêm gia vị), string (1 gia vị), hoặc array (nhiều)
    const ingredients = req.body.ingredients
      ? (Array.isArray(req.body.ingredients) ? req.body.ingredients : [req.body.ingredients])
      : [];

    await Food.create({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      image: image,
      category: req.body.category,
      spiceLevel: req.body.spiceLevel,
      soupType: req.body.soupType,
      ingredients: ingredients,
      status: true
    });

    res.redirect("/admin/foods");
  } catch (err) {
    console.error("LỖI THÊM MÓN:", err.message);
    console.error(err);
    res.status(500).send("Lỗi khi thêm món: " + err.message);
  }
});

router.get("/foods/edit/:id", isAdmin, async (req, res) => {
  const food = await Food.findById(req.params.id);

  res.render("admin/edit-food", { food, user: req.session.user });
});

router.post("/foods/edit/:id", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, price, description, status, category, spiceLevel, soupType } = req.body;

    // Hidden input "ingredients" có thể trả về: undefined (chưa thêm gia vị), string (1 gia vị), hoặc array (nhiều)
    const ingredients = req.body.ingredients
      ? (Array.isArray(req.body.ingredients) ? req.body.ingredients : [req.body.ingredients])
      : [];

    const updateData = {
      name,
      price,
      description,
      category,
      spiceLevel,
      soupType,
      ingredients,
      status: status === "true"
    };

    if (req.file) {
      // Có ảnh mới -> xóa ảnh cũ trên Cloudinary để tránh tích rác
      const oldFood = await Food.findById(req.params.id);
      if (oldFood) await deleteFoodImage(oldFood.image);

      updateData.image = req.file.path;
    }

    await Food.findByIdAndUpdate(req.params.id, updateData);

    res.redirect("/admin/foods");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/foods");
  }
});

router.post("/foods/delete/:id", isAdmin, async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (food) await deleteFoodImage(food.image);

    await Food.findByIdAndDelete(req.params.id);

    res.redirect("/admin/foods");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/foods");
  }
});

router.get("/orders", isAdmin, async (req, res) => {
  const orders = await Order.find()
    .populate("confirmedBy", "fullname email")
    .sort({ createdAt: -1 });

  res.render("admin/orders", { orders, user: req.session.user });
});

router.get("/orders/edit/:id", isAdmin, async (req, res) => {
  const order = await Order.findById(req.params.id);

  res.render("admin/edit-order", { order, user: req.session.user });
});

router.post("/orders/edit/:id", isAdmin, async (req, res) => {
  const { customerName, phone, address, status, paymentCode } = req.body;

  await Order.findByIdAndUpdate(req.params.id, {
    customerName,
    phone,
    address,
    status,
    paymentCode
  });

  res.redirect("/admin/orders");
});

router.post("/orders/delete/:id", isAdmin, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);

    if (req.headers["x-requested-with"] === "XMLHttpRequest" || req.headers.accept?.includes("application/json")) {
      return res.json({ success: true });
    }
    res.redirect("/admin/orders");
  } catch (err) {
    console.error(err);
    if (req.headers["x-requested-with"] === "XMLHttpRequest" || req.headers.accept?.includes("application/json")) {
      return res.status(500).json({ success: false, message: "Lỗi khi xóa đơn hàng" });
    }
    res.redirect("/admin/orders");
  }
});

router.get("/users", isAdmin, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.render("admin/users", { users, user: req.session.user });
});

router.post("/users/role/:id", isAdmin, async (req, res) => {
  const { role } = req.body;

  await User.findByIdAndUpdate(req.params.id, { role });

  res.redirect("/admin/users");
});

router.post("/users/password/request/:id", isAdmin, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.send("Bạn chưa nhập mật khẩu mới");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  req.session.changePassword = {
    userId: req.params.id,
    newPassword: password,
    otp,
    expires: Date.now() + 60 * 1000
  };

  await sendOTPEmail(process.env.ADMIN_EMAIL, otp);

  res.render("admin/verify-otp", {
    message: "Mã OTP đã được gửi về email Admin."
  });
});

router.post("/users/password/verify", isAdmin, async (req, res) => {
  const { otp } = req.body;
  const data = req.session.changePassword;

  if (!data) {
    return res.send("Không có yêu cầu đổi mật khẩu");
  }

  if (!data.newPassword) {
    return res.send("Không tìm thấy mật khẩu mới trong session");
  }

  if (Date.now() > data.expires) {
    req.session.changePassword = null;
    return res.send("OTP đã hết hạn");
  }

  if (otp !== data.otp) {
    return res.render("admin/verify-otp", {
      error: "Sai mã OTP"
    });
  }

  const hashPassword = await bcrypt.hash(data.newPassword, 10);

  await User.findByIdAndUpdate(data.userId, {
    password: hashPassword
  });

  req.session.changePassword = null;

  res.redirect("/admin/users");
});

// ── Trang thống kê ──
// Doanh thu/thống kê tính trên mọi đơn TRỪ đơn đã hủy (kể cả pending, confirmed...)
router.get("/statistics", isAdmin, async (req, res) => {
  try {
    const now = new Date();

    // Khoảng "hôm nay"
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Khoảng "tháng này"
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Khoảng "năm này"
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const baseMatch = { status: { $ne: "cancelled" } };

    async function getStatsForRange(start, end) {
      const match = { ...baseMatch, createdAt: { $gte: start, $lte: end } };

      const totals = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalPrice" },
            totalOrders: { $sum: 1 },
            totalItemsSold: { $sum: { $sum: "$items.quantity" } }
          }
        }
      ]);

      const foodStats = await Order.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            totalQuantity: { $sum: "$items.quantity" },
            totalMoney: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
          }
        },
        { $sort: { totalQuantity: -1 } }
      ]);

      return {
        totalRevenue: totals.length > 0 ? totals[0].totalRevenue : 0,
        totalOrders: totals.length > 0 ? totals[0].totalOrders : 0,
        totalItemsSold: totals.length > 0 ? totals[0].totalItemsSold : 0,
        topFood: foodStats.length > 0 ? foodStats[0] : null,
        foodStats
      };
    }

    const todayStats = await getStatsForRange(todayStart, todayEnd);
    const monthStats = await getStatsForRange(monthStart, monthEnd);
    const yearStats = await getStatsForRange(yearStart, yearEnd);

    res.render("admin/statistics", {
      user: req.session.user,
      todayStats,
      monthStats,
      yearStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi khi tải trang thống kê: " + err.message);
  }
});

// ── Xuất file Excel theo 1 ngày cụ thể ──
router.get("/statistics/export", isAdmin, async (req, res) => {
  try {
    const ExcelJS = require("exceljs");

    const { date } = req.query;
    if (!date) {
      return res.status(400).send("Thiếu ngày cần xuất báo cáo");
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const match = { status: { $ne: "cancelled" }, createdAt: { $gte: start, $lte: end } };

    const foodStats = await Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalQuantity: { $sum: "$items.quantity" },
          totalMoney: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    const totals = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = totals.length > 0 ? totals[0].totalRevenue : 0;
    const totalOrders = totals.length > 0 ? totals[0].totalOrders : 0;

    // Danh sách đầy đủ từng đơn hàng (kèm tên khách, SĐT, món đã đặt) cho sheet thứ 2
    const orderList = await Order.find(match).sort({ createdAt: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Báo cáo doanh thu");

    sheet.columns = [
      { header: "Tên món", key: "name", width: 32 },
      { header: "Số lượng bán", key: "quantity", width: 16 },
      { header: "Doanh thu (VNĐ)", key: "money", width: 20 }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: "center" };

    foodStats.forEach((item) => {
      sheet.addRow({
        name: item._id,
        quantity: item.totalQuantity,
        money: item.totalMoney
      });
    });

    sheet.addRow([]);

    const totalRow = sheet.addRow({
      name: "TỔNG DOANH THU",
      quantity: "",
      money: totalRevenue
    });
    totalRow.font = { bold: true };

    const orderCountRow = sheet.addRow({
      name: "TỔNG SỐ ĐƠN",
      quantity: totalOrders,
      money: ""
    });
    orderCountRow.font = { bold: true };

    sheet.getColumn("money").numFmt = "#,##0";

    // ── Sheet 2: Bảng tổng hợp dạng ma trận - mỗi dòng 1 khách, mỗi cột 1 món ──
    // Bảng quy ước mã viết tắt món (dò theo từ khóa có trong tên món thật)
    const foodCodeMap = [
      { keyword: "truyền thống", code: "TV" },
      { keyword: "mắm cá", code: "CL" },
      { keyword: "nhục thảo", code: "NT" },
      { keyword: "muối tân cương", code: "M" },
      { keyword: "chao thúi", code: "C" },
      { keyword: "phô mai", code: "PM" },
      { keyword: "sa tế", code: "ST" },
      { keyword: "phỉ thúy", code: "PT" },
      { keyword: "tương", code: "T" }
    ];

    function getFoodCode(foodName) {
      const lower = foodName.toLowerCase();
      const found = foodCodeMap.find((f) => lower.includes(f.keyword));
      return found ? found.code : foodName; // không khớp -> giữ tên gốc làm cột riêng
    }

    // Danh sách mã cột xuất hiện thực tế trong các đơn (theo đúng thứ tự quy ước trên, món nào không khớp xếp cuối)
    const allCodesInOrder = foodCodeMap.map((f) => f.code);
    const usedCodes = new Set();
    orderList.forEach((order) => {
      order.items.forEach((it) => usedCodes.add(getFoodCode(it.name)));
    });
    const extraCodes = [...usedCodes].filter((c) => !allCodesInOrder.includes(c));
    const finalCodes = allCodesInOrder.filter((c) => usedCodes.has(c)).concat(extraCodes);

    const orderSheet = workbook.addWorksheet("Bảng tổng hợp");

    // Dòng 1: nhóm "Tên món" gộp ô phía trên các cột món
    const headerRow1 = orderSheet.getRow(1);
    headerRow1.getCell(1).value = "STT";
    headerRow1.getCell(2).value = "Tên khách";
    headerRow1.getCell(3).value = "Số điện thoại";
    headerRow1.getCell(4).value = "Tên món";

    const firstFoodCol = 4;
    const lastFoodCol = firstFoodCol + finalCodes.length - 1;
    orderSheet.mergeCells(1, firstFoodCol, 1, lastFoodCol);

    const paymentCol = lastFoodCol + 1;
    const totalItemsCol = paymentCol + 1;
    const totalMoneyCol = totalItemsCol + 1;
    const noteCol = totalMoneyCol + 1;

    headerRow1.getCell(paymentCol).value = "Thanh Toán";
    headerRow1.getCell(totalItemsCol).value = "Tổng phần/khách";
    headerRow1.getCell(totalMoneyCol).value = "Thành Tiền";
    headerRow1.getCell(noteCol).value = "Ghi chú";

    orderSheet.mergeCells(1, 1, 2, 1); // STT
    orderSheet.mergeCells(1, 2, 2, 2); // Tên khách
    orderSheet.mergeCells(1, 3, 2, 3); // Số điện thoại
    orderSheet.mergeCells(1, paymentCol, 2, paymentCol);
    orderSheet.mergeCells(1, totalItemsCol, 2, totalItemsCol);
    orderSheet.mergeCells(1, totalMoneyCol, 2, totalMoneyCol);
    orderSheet.mergeCells(1, noteCol, 2, noteCol);

    // Dòng 2: từng mã món con
    const headerRow2 = orderSheet.getRow(2);
    finalCodes.forEach((code, i) => {
      headerRow2.getCell(firstFoodCol + i).value = code;
    });

    [headerRow1, headerRow2].forEach((row) => {
      row.font = { bold: true };
      row.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Độ rộng cột
    orderSheet.getColumn(1).width = 6;
    orderSheet.getColumn(2).width = 22;
    orderSheet.getColumn(3).width = 16;
    finalCodes.forEach((code, i) => {
      orderSheet.getColumn(firstFoodCol + i).width = 7;
    });
    orderSheet.getColumn(paymentCol).width = 12;
    orderSheet.getColumn(totalItemsCol).width = 14;
    orderSheet.getColumn(totalMoneyCol).width = 16;
    orderSheet.getColumn(noteCol).width = 20;

    // Dữ liệu từng đơn hàng
    orderList.forEach((order, idx) => {
      const rowIndex = 3 + idx;
      const row = orderSheet.getRow(rowIndex);

      row.getCell(1).value = idx + 1;
      row.getCell(2).value = order.customerName;
      row.getCell(3).value = order.phone;

      // Đếm số lượng theo từng mã món cho đơn này
      const qtyByCode = {};
      let totalItemsCount = 0;
      order.items.forEach((it) => {
        const code = getFoodCode(it.name);
        qtyByCode[code] = (qtyByCode[code] || 0) + it.quantity;
        totalItemsCount += it.quantity;
      });

      finalCodes.forEach((code, i) => {
        row.getCell(firstFoodCol + i).value = qtyByCode[code] || 0;
      });

      row.getCell(paymentCol).value = "CK";
      row.getCell(totalItemsCol).value = totalItemsCount;
      row.getCell(totalMoneyCol).value = order.totalPrice;
      row.getCell(noteCol).value = "";

      row.getCell(totalMoneyCol).numFmt = "#,##0";
    });

    const dateStr = date.replace(/-/g, "");
    const filename = `bao-cao-doanh-thu-${dateStr}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi khi xuất file Excel: " + err.message);
  }
});

module.exports = router;