const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(
  __dirname,
  "..",
  "public",
  "images"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

// Làm sạch tên file: bỏ dấu cách/ký tự đặc biệt, giữ chữ-số-gạch ngang-gạch dưới
function sanitizeFilename(name) {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
    .replace(/[^a-zA-Z0-9.\-_]/g, "-") // ký tự lạ -> gạch ngang
    .replace(/-+/g, "-"); // gộp nhiều gạch ngang liên tiếp
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = sanitizeFilename(
      path.basename(file.originalname, ext)
    );

    let finalName = baseName + ext;
    let counter = 1;

    // Nếu file đã tồn tại, tự động thêm số phía sau để tránh đè ảnh cũ
    while (fs.existsSync(path.join(uploadDir, finalName))) {
      finalName = `${baseName}-${counter}${ext}`;
      counter++;
    }

    cb(null, finalName);
  }
});

const upload = multer({
  storage
});

module.exports = upload;