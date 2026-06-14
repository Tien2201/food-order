const isLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
};

const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.send("Bạn không có quyền Admin");
  }

  next();
};

const isStaff = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "staff") {
    return res.send("Bạn không có quyền Nhân viên");
  }

  next();
};

module.exports = {
  isLogin,
  isAdmin,
  isStaff
};