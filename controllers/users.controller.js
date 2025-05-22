const db = require("../models");
const User = db.user;
const bcrypt = require("bcryptjs");

exports.getUsers = async (req, res) => {
  try {
    const {
      role,
      status,
      search,
      sortBy = "created_at",
      sortOrder = "DESC",
      limit = 10,
      page = 1,
    } = req.query;
    const offset = (page - 1) * limit;

    const where = { deleted_at: null };
    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where[db.Sequelize.Op.or] = [
        { name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { username: { [db.Sequelize.Op.iLike]: `%${search}%` } },
      ];
    }

    const validSortFields = ["created_at", "username", "name", "email"];
    const orderField = validSortFields.includes(sortBy) ? sortBy : "created_at";

    const users = await User.findAndCountAll({
      where,
      order: [[orderField, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: db.mosques,
          as: "mosque",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
      attributes: { exclude: ["password"] },
    });

    res.status(200).send({
      total: users.count,
      page: parseInt(page),
      users: users.rows,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const loggedInUserId = req.userId;
    const targetUserId = req.params.id;

    const { name, email, username, status, role } = req.body;

    if (!name || !email || !username) {
      return res
        .status(400)
        .send({ message: "Nama, email, dan username wajib diisi." });
    }

    const user = await User.findByPk(targetUserId, {
      include: [{ model: db.mosques, as: "mosque" }],
    });
    if (!user || user.deleted_at) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    const loggedInUser = await User.findByPk(loggedInUserId);
    if (!loggedInUser) {
      return res.status(403).send({ message: "Tidak diizinkan." });
    }

    if (loggedInUser.role === "superadmin") {
      await user.update({ name, email, username, status, role});

      return res
        .status(200)
        .send({ message: "Pengguna berhasil diperbarui oleh superadmin." });
    }

    if (loggedInUser.role === "admin") {
      if (loggedInUserId !== user.user_id) {
        return res.status(403).send({
          message: "Admin hanya dapat memperbarui akun miliknya sendiri.",
        });
      }
      await user.update({ name, email, username });
      return res.status(200).send({ message: "Profil Anda berhasil diperbarui." });
    }

    return res.status(403).send({
      message: "Anda tidak memiliki izin untuk melakukan tindakan ini.",
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send({ message: err.message });
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
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });

    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    res.status(200).send(user);
  } catch (error) { 
    res.status(500).send({ message: error.message });
  }
};

// PROFILE with mosque included
exports.profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: db.mosques,
          as: "mosque",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });

    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).send({ message: "Semua kolom wajib diisi." });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .send({ message: "Kata sandi baru minimal harus 8 karakter." });
    }

    if (newPassword !== confirmNewPassword) {
      return res
        .status(400)
        .send({ message: "Konfirmasi kata sandi tidak cocok." });
    }

    const user = await db.user.findByPk(userId);
    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    const isMatch = bcrypt.compareSync(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).send({ message: "Kata sandi saat ini salah." });
    }

    user.password = bcrypt.hashSync(newPassword, 8);
    await user.save();

    res.status(200).send({ message: "Kata sandi berhasil diperbarui." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user || user.deleted_at) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    await user.update({ deleted_at: new Date() });

    res.status(200).send({ message: "Pengguna berhasil dihapus sementara." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};