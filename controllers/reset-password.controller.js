// File: controllers/resetPasswordController.js
const db = require("../models");
const bcrypt = require("bcryptjs");
const { sendMail } = require("../utils/sendMail");

exports.sendResetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.user.findOne({ where: { email } });

    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan" });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.password_reset_code = resetCode;
    user.password_reset_expires_at = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    await sendMail({
      to: user.email,
      subject: "Reset Password",
      html: `<p>Kode reset password Anda adalah: ${resetCode}</p>`,
    });

    // Tampilkan resetCode di response (testing)
    // res.status(200).send({
    //   message: "Reset password code sent successfully",
    //   resetCode
    // });

    res.status(200).send({ message: "Kode reset password berhasil dikirim" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.verifyResetPassword = async (req, res) => {
  try {
    const { email, resetCode } = req.body;
    const user = await db.user.findOne({ where: { email } });

    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan" });
    }

    if (user.password_reset_code !== resetCode) {
      return res.status(400).send({ message: "Kode reset tidak valid" });
    }

    if (user.password_reset_expires_at < new Date()) {
      return res.status(400).send({ message: "Kode reset telah kedaluwarsa" });
    }

    res.status(200).send({ message: "Kode reset berhasil diverifikasi" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword, confirmNewPassword } = req.body;

    if (!email || !resetCode || !newPassword || !confirmNewPassword) {
      return res.status(400).send({ message: "Semua kolom wajib diisi." });
    }

    if (newPassword.length < 8) {
      return res.status(400).send({ message: "Kata sandi baru harus minimal 8 karakter." });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).send({ message: "Konfirmasi kata sandi tidak cocok." });
    }

    const user = await db.user.findOne({ where: { email } });
    if (!user) return res.status(404).send({ message: "Pengguna tidak ditemukan." });

    if (user.password_reset_code !== resetCode) {
      return res.status(400).send({ message: "Kode reset tidak valid." });
    }

    if (user.password_reset_expires_at < new Date()) {
      return res.status(400).send({ message: "Kode reset telah kedaluwarsa." });
    }

    user.password = bcrypt.hashSync(newPassword, 8);
    user.password_reset_code = null;
    user.password_reset_expires_at = null;
    await user.save();

    res.status(200).send({ message: "Kata sandi berhasil direset melalui kode reset." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
