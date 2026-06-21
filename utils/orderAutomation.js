const Order = require("../models/Order");

const ONE_HOUR_MS = 60 * 60 * 1000;

// ── Tự động chuyển đơn "delivering" quá 1 giờ sang "delivered" ──
// Không dùng cron job riêng (theo quyết định giữ đơn giản, phù hợp quy mô
// hiện tại) — thay vào đó, gọi hàm này ở các route polling đã có sẵn phía
// khách (/order-status, /notifications) và phía nhân viên (/staff/notifications).
// Mỗi khi có ai đang mở trang và trang tự polling, hệ thống nhân lúc đó kiểm
// tra luôn các đơn đã giao quá 1h chưa, nếu có thì cập nhật.
//
// Đánh đổi đã biết: nếu không có ai mở trang nào trong lúc đơn vừa đủ 1h,
// đơn sẽ chỉ được chuyển khi có người mở trang tiếp theo đó (chậm hơn 1h
// thật một chút) — chấp nhận được vì không cần thêm hạ tầng cron riêng.
async function autoCompleteDeliveredOrders() {
  try {
    const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS);

    await Order.updateMany(
      {
        status: "delivering",
        deliveringAt: { $ne: null, $lte: oneHourAgo }
      },
      {
        status: "delivered"
      }
    );
  } catch (err) {
    // Không để lỗi ở bước tự động này làm hỏng cả request polling chính
    console.error("Lỗi khi tự động chuyển đơn sang delivered:", err);
  }
}

module.exports = { autoCompleteDeliveredOrders };