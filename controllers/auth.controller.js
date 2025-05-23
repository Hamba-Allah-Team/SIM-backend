const db = require("../models");
const User = db.user;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

exports.signup = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const {
      username,
      email,
      password,
      name,
      role,
      status,
      mosque_name,
      mosque_address,
      mosque_description,
      mosque_phone_whatsapp,
      mosque_email,
      mosque_facebook,
      mosque_instagram,
    } = req.body;

    // Validasi input wajib
    if (!username || !email || !password || !name) {
      return res
        .status(400)
        .send({ message: "Semua kolom wajib diisi." });
    }

    // Validasi format email
    if (!validator.isEmail(email)) {
      return res.status(400).send({ message: "Format email tidak valid." });
    }

    // Validasi panjang password (minimal 8 karakter)
    if (password.length < 8) {
      return res
        .status(400)
        .send({ message: "Kata sandi minimal harus 8 karakter." });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).send({ message: "Email sudah terdaftar." });
    }

    // Tentukan tanggal expired
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 30);

    // Buat user baru
    const user = await User.create(
      {
        mosque_id: null,
        username,
        email,
        password: bcrypt.hashSync(password, 8),
        name,
        role: role || "admin",
        status: status || "active",
        expired_at: expiredAt,
      },
      { transaction: t }
    );

    let mosqueId = req.body.mosque_id;

    // Jika user adalah admin buat masjid baru
    if (!mosqueId && user.role === "admin") {
      const mosque = await db.mosques.create(
        {
          name: mosque_name,
          address: mosque_address,
          description: mosque_description || null,
          phone_whatsapp: mosque_phone_whatsapp || null,
          email: mosque_email || null,
          facebook: mosque_facebook || null,
          instagram: mosque_instagram || null,
        },
        { transaction: t }
      );

      mosqueId = mosque.mosque_id;
      await user.update({ mosque_id: mosqueId }, { transaction: t });
    }

    await t.commit();
    res.status(201).send({ message: "Pendaftaran pengguna berhasil!" });
  } catch (error) {
    await t.rollback();
    res.status(500).send({ message: error.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res
        .status(400)
        .send({ message: "Email dan kata sandi wajib diisi." });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    if (user.deleted_at) {
      return res.status(403).send({
        accessToken: null,
        message:
          "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.",
      });
    }

    // Verifikasi password
    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Kata sandi salah!",
      });
    }

    // Cek status akun
    if (user.role === "admin" && user.status === "inactive") {
      return res.status(403).send({
        accessToken: null,
        message: "Akun Anda tidak aktif. Silakan Lakukan Perpanjangan.",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000, // 1 jam
    });

    res.status(200).send({
      id: user.user_id,
      username: user.username,
      email: user.email,
      message: "Login berhasil",
      token: token,
      role: user.role,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).send({ message: "Anda berhasil keluar." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
