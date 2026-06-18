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

module.exports = upload;