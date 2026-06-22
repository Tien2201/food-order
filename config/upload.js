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

// ── Giới hạn định dạng file ảnh được phép upload ──
// Chấp nhận: JPEG, JPG, PNG, WEBP. Từ chối các định dạng khác (vd: .gif, .bmp, .svg)
// để tránh ảnh lỗi định dạng hoặc file giả mạo đuôi ảnh.
function imageFileFilter(req, file, cb) {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh định dạng JPEG, JPG, PNG hoặc WEBP."));
  }
}

// Upload ảnh trang Giới thiệu (About) - 4 vị trí cố định: 1 ảnh story lớn
// + 3 ảnh gallery món ăn. Mỗi vị trí có public_id riêng để ghi đè đúng ảnh,
// không ảnh hưởng tới 3 ảnh còn lại khi admin thay 1 ảnh.
const aboutStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // req.params.slot nhận giá trị: "story", "gallery1", "gallery2", "gallery3"
    const slot = req.params.slot || "story";
    return {
      folder: "food-order/about",
      public_id: "about-" + slot,
      overwrite: true
    };
  }
});

const uploadAbout = multer({ storage: aboutStorage, fileFilter: imageFileFilter });

// Upload ảnh đại diện (avatar) cá nhân - mỗi user có public_id riêng theo
// _id của họ, ghi đè đúng avatar cũ của chính mình khi đổi ảnh mới.
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req) => ({
    folder: "food-order/avatars",
    public_id: "avatar-" + req.session.user._id,
    overwrite: true
  })
});

const uploadAvatar = multer({ storage: avatarStorage, fileFilter: imageFileFilter });

// Upload ảnh cho bài đăng thảo luận/feedback - mỗi bài có thể có nhiều ảnh
// (tối đa 4), mỗi ảnh cần tên riêng. Dùng cả timestamp + số ngẫu nhiên để
// tránh trùng tên khi nhiều ảnh được xử lý cùng lúc trong 1 request.
const postImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: () => ({
    folder: "food-order/discussion-posts",
    public_id: "post-" + Date.now() + "-" + Math.round(Math.random() * 1e9),
    resource_type: "image"
  })
});

const uploadPostImages = multer({ storage: postImageStorage, fileFilter: imageFileFilter });

module.exports = upload;
module.exports.uploadQr = uploadQr;
module.exports.uploadPaymentProof = uploadPaymentProof;
module.exports.uploadAbout = uploadAbout;
module.exports.uploadAvatar = uploadAvatar;
module.exports.uploadPostImages = uploadPostImages;