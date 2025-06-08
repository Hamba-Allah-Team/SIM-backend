const db = require("../models");
const axios = require('axios');
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

    const fs = require("fs");
    const path = require("path");

    const deleteImage = req.body.deleteImage === "true";

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

    const mosque = await Mosque.findByPk(mosque_id);
    if (!mosque) {
      return res.status(404).send({ message: "Data masjid tidak ditemukan." });
    }

    // Proses update gambar, jika ada file baru di req.file
    let imageFilename = mosque.image; // default gambar lama

    if (deleteImage) {
      if (mosque.image) {
        const imagePath = path.join(__dirname, "../uploads", mosque.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      imageFilename = null;
    } else if (req.file) {
      if (!isValidImage(req.file)) {
        return res.status(400).send({ message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG." });
      }
      if (mosque.image) {
        const imagePath = path.join(__dirname, "../uploads", mosque.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      imageFilename = req.file.filename;
    }

    // Validasi longitude dan latitude (optional, harus angka jika diisi)
    if (longitude !== undefined && longitude !== null && longitude.trim() !== "" && isNaN(parseFloat(longitude))) {
      return res.status(400).send({
        message: "Longitude harus berupa angka.",
      });
    }

    if (latitude !== undefined && latitude !== null && latitude.trim() !== "" && isNaN(parseFloat(latitude))) {
      return res.status(400).send({
        message: "Latitude harus berupa angka.",
      });
    }


    await mosque.update({
      name,
      address,
      description: description ?? "",      // jika undefined jadi string kosong
      image: imageFilename,
      phone_whatsapp: phone_whatsapp ?? "",
      email: email ?? "",
      facebook: facebook ?? "",
      instagram: instagram ?? "",
      longitude: longitude && longitude.trim() !== "" ? parseFloat(longitude) : null,
      latitude: latitude && latitude.trim() !== "" ? parseFloat(latitude) : null,
    });


    res.status(200).send({ message: "Profil masjid berhasil diperbarui." });
  } catch (err) {
    console.error("Error saat memperbarui profil masjid:", err);
    res
      .status(500)
      .send({ message: "Terjadi kesalahan saat memperbarui profil masjid." });
  }
};

exports.getPublicMosqueBySlug = async (req, res) => {
  try {
    // 1. Mengambil slug dari parameter URL
    const { slug } = req.params;

    // 2. Mencari masjid berdasarkan kolom 'slug' yang unik
    const mosque = await Mosque.findOne({
      where: { slug: slug },
      // Hanya mengambil kolom yang aman untuk ditampilkan ke publik
      attributes: [
        "name", "address", "description", "image",
        "phone_whatsapp", "email", "facebook", "instagram",
        "longitude", "latitude"
      ],
    });

    if (!mosque) {
      return res.status(404).send({ message: "Data masjid tidak ditemukan." });
    }

    res.status(200).send({ data: mosque });
  } catch (err) {
    console.error("Error saat mengambil data masjid publik:", err);
    res.status(500).send({ message: "Gagal mengambil data masjid." });
  }
};

exports.getPrayerTimesBySlug = async (req, res) => {
  try {
    // 1. Mengambil slug dari parameter URL
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ message: "Slug masjid diperlukan." });
    }

    // 2. Mencari masjid di database berdasarkan slug
    const mosque = await Mosque.findOne({ where: { slug } });
    if (!mosque) {
      return res.status(404).json({ message: "Masjid tidak ditemukan." });
    }

    // 3. Periksa apakah masjid memiliki data koordinat
    const { latitude, longitude } = mosque;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Data koordinat untuk masjid ini tidak tersedia." });
    }

    // 4. Panggil API Al-Adhan dengan koordinat yang didapat
    const response = await axios.get(`http://api.aladhan.com/v1/timings`, {
      params: { latitude, longitude, method: 8 }
    });

    if (response.data && response.data.code === 200 && response.data.data) {
      const timings = response.data.data.timings;
      const hijriDate = response.data.data.date.hijri;

      const formattedData = {
        subuh: timings.Fajr,
        dzuhur: timings.Dhuhr,
        ashar: timings.Asr,
        maghrib: timings.Maghrib,
        isya: timings.Isha,
        tanggalHijriyah: `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year}`
      };
      res.status(200).json(formattedData);
    } else {
      throw new Error(response.data.data || "API jadwal sholat tidak memberikan respons yang valid.");
    }

  } catch (error) {
    console.error("Gagal mengambil data jadwal sholat:", error.response ? error.response.data : error.message);
    res.status(500).json({ message: "Gagal memproses permintaan jadwal sholat." });
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
