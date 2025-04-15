const db = require("../models");
const User = db.user;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const validator = require("validator");
const { sendMail } = require("../utils/sendMail");

exports.signup = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const { username, email, password, name, role, status, mosque_name, mosque_address, mosque_description, mosque_phone_whatsapp, mosque_email, mosque_facebook, mosque_instagram } = req.body;

    // Validasi input wajib
    if (!username || !email || !password || !name) {
      return res.status(400).send({ message: "All required fields must be filled." });
    }

    // Validasi format email
    if (!validator.isEmail(email)) {
      return res.status(400).send({ message: "Invalid email format." });
    }

    // Validasi panjang password (minimal 8 karakter)
    if (password.length < 8) {
      return res.status(400).send({ message: "Password must be at least 8 characters long." });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).send({ message: "Email already registered." });
    }

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
    res.status(201).send({ message: "User registered successfully!" });
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
      return res.status(400).send({ message: "Email and password are required." });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Verifikasi password
    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Invalid Password!",
      });
    }

    // Cek status akun
    if (user.role === "admin" && user.status === "inactive") {
      return res.status(403).send({
        accessToken: null,
        message: "Your account is inactive. Please contact the administrator.",
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
      maxAge: 3600000, // 1 hour
    });

    res.status(200).send({
      id: user.user_id,
      username: user.username,
      email: user.email,
      message: "Login successful",
      token: token,
      role: user.role,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.mosques,
          as: "mosque",
          attributes: { exclude: ["createdAt", "updatedAt"] }
        }
      ]
    });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).send({ message: "You have been logged out successfully." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.sendResetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ message: "Email is required." });

    const user = await db.user.findOne({ where: { email } });
    if (!user) return res.status(404).send({ message: "User not found." });

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendMail({
      to: user.email,
      subject: "Reset Password - SIM Masjid",
      html: `<p>Click the following link to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a><br/>
             <p>This link will expire in 15 minutes.</p>`,
    });

    res.status(200).send({ message: "Reset password email sent successfully." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).send({ message: "Token and new password are required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.user.findByPk(decoded.id);

    if (!user) return res.status(404).send({ message: "User not found." });

    const hashedPassword = bcrypt.hashSync(newPassword, 8);
    await user.update({ password: hashedPassword });

    res.status(200).send({ message: "Password has been reset successfully." });
  } catch (err) {
    res.status(500).send({ message: "Invalid or expired token." });
  }
};
