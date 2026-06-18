const multer = require("multer");
const path = require("path");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

// Làm sạch tên file: bỏ dấu tiếng Việt + ký tự đặc biệt, giữ chữ-số-gạch ngang
function sanitizeFilename(name) {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const ext = path.extname(file.originalname).replace(".", "");
    const baseName = sanitizeFilename(
      path.basename(file.originalname, path.extname(file.originalname))
    );

    return {
      folder: "food-order/foods", // thư mục trên Cloudinary, không phải trên server
      public_id: baseName,        // giữ tên gốc của ảnh (không có timestamp)
      format: ext || "jpg",
      overwrite: true             // nếu trùng tên, ghi đè ảnh cũ trên Cloudinary
    };
  }
});

const upload = multer({ storage });

// Upload riêng cho ảnh QR thanh toán của quán (admin) - luôn ghi đè ảnh QR cũ,
// vì chỉ cần đúng 1 ảnh QR duy nhất tồn tại ở mọi thời điểm.
const qrStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: () => ({
    folder: "food-order/settings",
    public_id: "payment-qr",
    overwrite: true
  })
});

const uploadQr = multer({ storage: qrStorage });

// Upload riêng cho ảnh chứng minh chuyển khoản do khách gửi - mỗi ảnh cần
// tên riêng (dùng timestamp) để không bị đè lẫn giữa các đơn khác nhau.
// Không ép "format" theo phần mở rộng tên file gốc (vd: .JPEG viết hoa,
// hoặc ảnh HEIC từ iPhone được đặt tên .jpeg) - để Cloudinary tự nhận diện
// định dạng thật dựa trên nội dung file, tránh lỗi upload từ điện thoại.
const paymentProofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: () => ({
    folder: "food-order/payment-proofs",
    public_id: "proof-" + Date.now(),
    resource_type: "image"
  })
});

const uploadPaymentProof = multer({ storage: paymentProofStorage });

module.exports = upload;
module.exports.uploadQr = uploadQr;
module.exports.uploadPaymentProof = uploadPaymentProof;