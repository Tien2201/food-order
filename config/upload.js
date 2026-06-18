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
// const paymentProofStorage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: (req, file) => {
//     const ext = path.extname(file.originalname).replace(".", "");
//     return {
//       folder: "food-order/payment-proofs",
//       public_id: "proof-" + Date.now(),
//       format: ext || "jpg",
//     };
//   }
// });
const paymentProofStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {

    let ext = path
      .extname(file.originalname)
      .replace(".", "")
      .toLowerCase();

    const allowedFormats = [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "heic",
      "heif"
    ];

    if (!allowedFormats.includes(ext)) {
      ext = "jpg";
    }

    return {
      folder: "food-order/payment-proofs",
      public_id: "proof-" + Date.now(),
      format: ext
    };
  }
});

// const uploadPaymentProof = multer({ storage: paymentProofStorage });
const uploadPaymentProof = multer({
  storage: paymentProofStorage,

  fileFilter: (req, file, cb) => {

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép file ảnh"));
    }
  },

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

module.exports = upload;
module.exports.uploadQr = uploadQr;
module.exports.uploadPaymentProof = uploadPaymentProof;