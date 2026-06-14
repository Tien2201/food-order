const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTPEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"Food Order Security" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Mã OTP đổi mật khẩu",
    html: `
      <h2>Xác nhận đổi mật khẩu</h2>
      <p>Mã OTP của bạn là:</p>
      <h1>${otp}</h1>
      <p>Mã này có hiệu lực trong 1 phút.</p>
    `
  });
};

module.exports = sendOTPEmail;