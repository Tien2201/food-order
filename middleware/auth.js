const isLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
};

const isAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if (req.session.user.role !== "admin") {
    return res.redirect("/login");
  }

  next();
};

const isStaff = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if (req.session.user.role !== "staff") {
    return res.redirect("/login");
  }

  next();
};

module.exports = {
  isLogin,
  isAdmin,
  isStaff
};