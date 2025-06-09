const db = require("../models");
const User = db.user;
const bcrypt = require("bcryptjs"); 
const moment = require("moment");

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
    console.error("Error fetching users:", err);
    res.status(500).send({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const loggedInUserId = req.userId;
    const targetUserId = req.params.id;
    const { name, email, username, status, role, password } = req.body;

    // Validasi input dasar
    if (!name || !email || !username) {
      return res.status(400).send({ message: "Nama, email, dan username wajib diisi." });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).send({ message: "Format email tidak valid" });
    }

    const user = await User.findByPk(targetUserId);
    if (!user || user.deleted_at) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    // Cek email unik HANYA jika email berubah
    if (user.email !== email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.user_id !== targetUserId) {
        return res.status(400).send({ message: "Email sudah digunakan oleh pengguna lain" });
      }
    }

    const loggedInUser = await User.findByPk(loggedInUserId);
    if (!loggedInUser) {
      return res.status(403).send({ message: "Tidak diizinkan (pengguna tidak valid)." });
    }

    // Verifikasi password hanya untuk perubahan email
    if (user.email !== email) {
      if (!password) {
        return res.status(400).send({ message: "Password diperlukan untuk mengubah email" });
      }

      const isPasswordValid = await bcrypt.compare(password, loggedInUser.password);
      if (!isPasswordValid) {
        return res.status(401).send({ message: "Password tidak valid" });
      }
    }

    // Update user
    await user.update({ 
      name, 
      username,
      email,
      ...(loggedInUser.role === 'superadmin' && { status, role })
    });

    // Kirim notifikasi email jika email berubah
    if (user.email !== email) {
      await sendMail({
        to: email,
        subject: "Perubahan Email Berhasil",
        html: `Halo ${name},<br><br>
              Email akun Anda telah berhasil diubah.<br>
              Email baru: ${email}<br><br>
              Jika Anda tidak melakukan perubahan ini, segera hubungi layanan dukungan.<br><br>
              Terima kasih.`
      });

      await sendMail({
        to: user.email,
        subject: "Pemberitahuan Perubahan Email",
        html: `Halo ${name},<br><br>
              Email akun Anda telah diubah menjadi ${email}.<br>
              Jika Anda tidak melakukan perubahan ini, segera hubungi layanan dukungan.<br><br>
              Terima kasih.`
      });
    }

    return res.status(200).send({ message: "Profil berhasil diperbarui." });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send({ message: err.message });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: [
        ['user_id', 'id'],
        "username",
        "name",
        "email",
        "role",
        "status"
      ],
      include: [{
        model: db.mosques,
        as: "mosque",
        attributes: { exclude: ["createdAt", "updatedAt"] },
      }],
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

    const user = await User.findByPk(userId); 
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
    console.error("Error changing password:", error);
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
    console.error("Error soft deleting user:", err);
    res.status(500).send({ message: err.message });
  }
};
exports.getAdminActivityTrend = async (req, res) => {
  try {
    const { period } = req.query;
    let startDate;
    let endDate = moment().endOf('day');
    let groupByAttribute;
    let granularity;

    switch (period) {
      case "7d":
        startDate = moment().subtract(6, "days").startOf('day');
        groupByAttribute = [db.Sequelize.fn('DATE_TRUNC', 'day', db.Sequelize.col('created_at')), 'date_group'];
        granularity = 'day';
        break;
      case "30d":
        startDate = moment().subtract(29, "days").startOf('day');
        groupByAttribute = [db.Sequelize.fn('DATE_TRUNC', 'day', db.Sequelize.col('created_at')), 'date_group'];
        granularity = 'day';
        break;
      case "12m":
        startDate = moment().subtract(11, "months").startOf('month');
        groupByAttribute = [db.Sequelize.fn('DATE_TRUNC', 'month', db.Sequelize.col('created_at')), 'date_group'];
        granularity = 'month';
        break;
      default:
        return res.status(400).send({ message: "Periode tidak valid." });
    }

    const trendData = await User.findAll({
      attributes: [
        groupByAttribute,
        [db.Sequelize.fn('COUNT', db.Sequelize.col('user_id')), 'activeCount'],
      ],
      where: {
        role: 'admin',
        status: 'active',
        deleted_at: null,
        created_at: {
          [db.Sequelize.Op.gte]: startDate.toDate(),
          [db.Sequelize.Op.lte]: endDate.toDate(),
        },
      },
      group: [db.Sequelize.col('date_group')],
      order: [[db.Sequelize.col('date_group'), 'ASC']],
      raw: true,
    });

    // Create Indonesian month names mapping
    const indonesianMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const resultsMap = new Map();
    trendData.forEach(item => {
      const dateKey = moment(item.date_group).format(granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM');
      resultsMap.set(dateKey, parseInt(item.activeCount, 10));
    });

    const finalTrend = [];
    let currentDate = moment(startDate);

    while (currentDate.isSameOrBefore(endDate, granularity)) {
      const dateKey = currentDate.format(granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM');
      let label;

      if (granularity === 'day') {
        // Format for day view: "DD MMM" (e.g., "01 Jan")
        label = currentDate.format('DD MMM');
      } else {
        // Format for month view: Full month name (e.g., "Januari")
        const monthIndex = currentDate.month();
        label = indonesianMonths[monthIndex];
      }

      finalTrend.push({
        date: label,
        active: resultsMap.get(dateKey) || 0,
      });

      currentDate.add(1, granularity);
    }

    res.status(200).send(finalTrend);

  } catch (err) {
    console.error("Error fetching admin activity trend:", err);
    res.status(500).send({ 
      message: err.message || "Terjadi kesalahan internal saat mengambil data tren." 
    });
  }
};