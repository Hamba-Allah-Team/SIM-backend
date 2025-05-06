const db = require("../models");
const Mosque = db.mosques;

// GET mosque info (about)
exports.getAbout = async (req, res) => {
  try {
    const user_id = req.userId;
    const user = await db.user.findByPk(user_id);

    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    const mosque_id = user.mosque_id;

    const mosque = await Mosque.findByPk(mosque_id);

    if (!mosque) {
      return res.status(404).send({ message: "Data masjid tidak ditemukan." });
    }

    res.status(200).send({ data: mosque });
  } catch (err) {
    console.error("Error saat mengambil data masjid:", err);
    res.status(500).send({ message: "Gagal mengambil data masjid." });
  }
};

// Get about mosque (admin)
exports.updateAbout = async (req, res) => {
  try {
    const user_id = req.userId;

    const user = await db.user.findByPk(user_id);
    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    const mosque_id = user.mosque_id;

    const {
      name,
      address,
      description,
      image,
      phone_whatsapp,
      email,
      facebook,
      instagram
    } = req.body;

    // Validasi wajib isi
    if (!name || !address) {
      return res.status(400).send({
        message: "Nama dan alamat masjid wajib diisi."
      });
    }

    // Validasi format gambar jika diisi
    if (image) {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const extension = image.substring(image.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        return res.status(400).send({
          message: "Format gambar tidak valid. Hanya diperbolehkan: jpg, jpeg, png, webp."
        });
      }
    }

    // Validasi email jika diisi
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).send({
          message: "Format email tidak valid."
        });
      }
    }

    // Validasi nomor WhatsApp jika diisi
    if (phone_whatsapp) {
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(phone_whatsapp)) {
        return res.status(400).send({
          message: "Nomor WhatsApp harus berupa angka dan minimal 10 digit."
        });
      }
    }

    const mosque = await db.mosques.findByPk(mosque_id);
    if (!mosque) {
      return res.status(404).send({ message: "Data masjid tidak ditemukan." });
    }

    await mosque.update({
      name,
      address,
      description,
      image,
      phone_whatsapp,
      email,
      facebook,
      instagram
    });

    res.status(200).send({ message: "Profil masjid berhasil diperbarui." });
  } catch (err) {
    console.error("Error saat memperbarui profil masjid:", err);
    res.status(500).send({ message: "Terjadi kesalahan saat memperbarui profil masjid." });
  }
};

//get about mosque (guest)
exports.getAboutByMosqueId = async (req, res) => {
  try {
    const { mosque_id } = req.params;

    const mosque = await db.mosques.findByPk(mosque_id, {
      attributes: [
        'mosque_id',
        'name',
        'address',
        'description',
        'image',
        'phone_whatsapp',
        'email',
        'facebook',
        'instagram',
        'created_at',
        'updated_at'
      ]
    });

    if (!mosque) {
      return res.status(404).send({ message: "Data masjid tidak ditemukan." });
    }

    res.status(200).send(mosque);
  } catch (err) {
    console.error("Error saat mengambil data masjid:", err);
    res.status(500).send({ message: "Terjadi kesalahan saat mengambil data masjid." });
  }
};
