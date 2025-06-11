const db = require("../models");
const User = db.user;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

exports.signup = async (req, res) => {
  const {
    username,
    email,
    password,
    name,
    role,
    status,
    mosque_name,
    mosque_address,
  } = req.body;

  if (!username || !email || !password || !name) {
    return res.status(400).send({ message: "Semua kolom wajib diisi." });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).send({ message: "Format email tidak valid." });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .send({ message: "Kata sandi minimal harus 8 karakter." });
  }
  if ((!role || role === "admin") && !req.body.mosque_id && (!mosque_name || !mosque_address)) {
    return res.status(400).send({ message: "Nama dan alamat masjid wajib diisi untuk admin baru." });
  }

  let t;

  try {
    const lowerCaseEmail = email.toLowerCase();
    
    const existingUser = await User.findOne({ where: { email: lowerCaseEmail } });
    if (existingUser) {
      return res.status(409).send({ message: "Email sudah terdaftar." });
    }

    t = await db.sequelize.transaction();

    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 30); 

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create(
      {
        mosque_id: null,
        username,
        email: lowerCaseEmail,
        password: hashedPassword,
        name,
        role: role || "admin",
        status: status || "active",
        expired_at: expiredAt,
      },
      { transaction: t }
    );

    let mosqueId = req.body.mosque_id;

    if (!mosqueId && user.role === "admin") {
      const mosque = await db.mosques.create(
        {
          name: mosque_name,
          address: mosque_address,
        },
        { transaction: t }
      );
      mosqueId = mosque.mosque_id;
      await user.update({ mosque_id: mosqueId }, { transaction: t });
    }

    await t.commit();
    res.status(201).send({ message: "Pendaftaran pengguna berhasil!" });

  } catch (error) {
    if (t) {
      await t.rollback();
    }
    res.status(500).send({ message: error.message || "Terjadi kesalahan pada server." });
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

    const lowerCaseEmail = email.toLowerCase();

    const user = await User.findOne({
      where: {
        email: lowerCaseEmail,
      },
    });

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
        message: "Account Inactive",
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
