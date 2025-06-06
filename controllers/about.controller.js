const db = require("../models");
const Mosque = db.mosques;

// Validasi format gambar
const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const isValidImage = (file) => {
  return file && validImageTypes.includes(file.mimetype);
};

// GET mosque info (about) untuk user yang sudah login
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

// UPDATE about mosque (admin)
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
      phone_whatsapp,
      email,
      facebook,
      instagram,
      longitude,
      latitude,
    } = req.body;

    // Validasi wajib isi
    if (!name || !address) {
      return res.status(400).send({
        message: "Nama dan alamat masjid wajib diisi.",
      });
    }

    // Validasi email jika diisi
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).send({
          message: "Format email tidak valid.",
        });
      }
    }

    // Validasi nomor WhatsApp jika diisi
    if (phone_whatsapp) {
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(phone_whatsapp)) {
        return res.status(400).send({
          message: "Nomor WhatsApp harus berupa angka dan minimal 10 digit.",
        });
      }
    }

    // Validasi longitude dan latitude (optional, tapi kalau ada harus berupa angka)
    if (longitude && isNaN(parseFloat(longitude))) {
      return res.status(400).send({
        message: "Longitude harus berupa angka.",
      });
    }

    if (latitude && isNaN(parseFloat(latitude))) {
      return res.status(400).send({
        message: "Latitude harus berupa angka.",
      });
    }

    const mosque = await Mosque.findByPk(mosque_id);
    if (!mosque) {
      return res.status(404).send({ message: "Data masjid tidak ditemukan." });
    }

    // Proses update gambar, jika ada file baru di req.file
    let imageFilename = mosque.image; // default gambar lama

    if (req.file) {
      if (!isValidImage(req.file)) {
        return res.status(400).send({
          message:
            "Format gambar tidak valid. Hanya diperbolehkan: PNG, JPG, JPEG, WEBP.",
        });
      }
      imageFilename = req.file.filename;
    }

    // Validasi longitude dan latitude (optional, harus angka jika diisi)
    if (longitude !== undefined && isNaN(parseFloat(longitude))) {
      return res.status(400).send({
        message: "Longitude harus berupa angka.",
      });
    }

    if (latitude !== undefined && isNaN(parseFloat(latitude))) {
      return res.status(400).send({
        message: "Latitude harus berupa angka.",
      });
    }
    
    await mosque.update({
      name,
      address,
      description,
      image: imageFilename,
      phone_whatsapp,
      email,
      facebook,
      instagram,
      longitude: longitude !== undefined ? parseFloat(longitude) : mosque.longitude,
      latitude: latitude !== undefined ? parseFloat(latitude) : mosque.latitude,
    });

    res.status(200).send({ message: "Profil masjid berhasil diperbarui." });
  } catch (err) {
    console.error("Error saat memperbarui profil masjid:", err);
    res
      .status(500)
      .send({ message: "Terjadi kesalahan saat memperbarui profil masjid." });
  }
};

// GET about mosque by mosque_id (guest)
exports.getAboutByMosqueId = async (req, res) => {
  try {
    const { mosque_id } = req.params;

    const mosque = await Mosque.findByPk(mosque_id, {
      attributes: [
        "mosque_id",
        "name",
        "address",
        "description",
        "image",
        "phone_whatsapp",
        "email",
        "facebook",
        "instagram",
        "longitude",
        "latitude",
        "created_at",
        "updated_at",
      ],
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
