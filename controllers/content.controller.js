const db = require("../models");
const Content = db.contents;
const { Op } = require("sequelize");

// Validasi format gambar
const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];

const isValidImage = (file) => {
  return file && validImageTypes.includes(file.mimetype);
};

// CREATE a new content
exports.createContent = async (req, res) => {
  try {
    const { title, content_description, published_date, contents_type } = req.body;

    const user_id = req.userId;
    const user = await db.user.findByPk(user_id);
    if (!user) return res.status(404).send({ message: "Pengguna tidak ditemukan." });

    const mosque_id = user.mosque_id;

    if (!title || !published_date || !contents_type) {
      return res.status(400).send({ message: "Judul, tanggal publikasi, dan jenis konten wajib diisi." });
    }

    let imageFilename = null;
    if (req.file) {
      if (!isValidImage(req.file)) {
        return res.status(400).send({ message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG." });
      }
      imageFilename = req.file.filename;
    }

    const content = await Content.create({
      title,
      content_description,
      image: imageFilename,
      published_date,
      contents_type,
      user_id,
      mosque_id,
    });

    res.status(201).send({
      message: "Artikel berhasil dibuat.",
      data: content,
    });
  } catch (err) {
    console.error("Error saat membuat artikel:", err);
    res.status(500).send({ message: "Terjadi kesalahan saat membuat artikel." });
  }
};

// UPDATE a content
exports.updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content_description, published_date, contents_type } = req.body;

    const user_id = req.userId;
    const user = await db.user.findByPk(user_id);
    if (!user) return res.status(404).send({ message: "Pengguna tidak ditemukan." });

    const mosque_id = user.mosque_id;

    const fs = require("fs");
    const path = require("path");

    const deleteImage = req.body.deleteImage === "true";

    if (!title || !published_date || !contents_type) {
      return res.status(400).send({ message: "Judul, tanggal publikasi, dan jenis konten wajib diisi." });
    }

    const article = await Content.findByPk(id);
    if (!article) return res.status(404).send({ message: "Artikel tidak ditemukan." });

    if (article.mosque_id !== mosque_id) {
      return res.status(403).send({ message: "Anda tidak memiliki izin untuk mengedit artikel ini." });
    }

    // Jika ada file image baru yang diupload, validasi dan gunakan filename baru
    let imageFilename = article.image;
    if (deleteImage) {
      if (article.image) {
        const imagePath = path.join(__dirname, "../uploads", article.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      imageFilename = null;
    } else if (req.file) {
      if (!isValidImage(req.file)) {
        return res.status(400).send({ message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG." });
      }
      if (article.image) {
        const imagePath = path.join(__dirname, "../uploads", article.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      imageFilename = req.file.filename;
    }

    await article.update({
      title,
      content_description,
      image: imageFilename,
      published_date,
      contents_type,
      user_id,
      mosque_id,
    });

    res.status(200).send({ message: "Artikel berhasil diperbarui.", data: article });
  } catch (err) {
    console.error("Error saat memperbarui artikel:", err);
    res.status(500).send({ message: "Terjadi kesalahan saat memperbarui artikel." });
  }
};

// DELETE a content
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    // Mendapatkan user_id dari request setelah verifikasi token
    const user_id = req.userId;
    const user = await db.user.findByPk(user_id);
    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    const mosque_id = user.mosque_id; // Ambil mosque_id dari data user

    const article = await Content.findByPk(id);

    if (!article) {
      return res.status(404).send({ message: "Artikel tidak ditemukan." });
    }

    // Pastikan artikel ini milik masjid yang sesuai dengan user yang login
    if (article.mosque_id !== mosque_id) {
      return res.status(403).send({ message: "Anda tidak memiliki izin untuk menghapus artikel ini." });
    }

    await article.destroy();

    res.status(200).send({ message: "Artikel berhasil dihapus." });
  } catch (err) {
    res.status(500).send({ message: "Terjadi kesalahan saat menghapus artikel." });
  }
};

// GET all contents (search, sort, pagination)
exports.getContents = async (req, res) => {
  try {
    const { search = "", sortBy = "published_date", order = "ASC" } = req.query;

    // Mendapatkan user_id dari request setelah verifikasi token
    const user_id = req.userId;
    const user = await db.user.findByPk(user_id);
    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    const mosque_id = user.mosque_id; // Ambil mosque_id dari data user

    // Ambil semua data artikel berdasarkan mosque_id dan pencarian
    const contents = await Content.findAll({
      where: {
        mosque_id,
        [Op.or]: [
          {
            title: {
              [Op.like]: `%${search}%`,
            },
          },
          {
            content_description: {
              [Op.like]: `%${search}%`,
            },
          },
        ],
      },
      order: [[sortBy, order]], // Urutkan hasil
    });

    res.status(200).send({
      data: contents,
      totalCount: contents.length,
    });
  } catch (err) {
    console.error("Error saat mengambil artikel:", err);
    res.status(500).send({ message: "Terjadi kesalahan saat mengambil artikel." });
  }
};

// GET content by ID
exports.getContentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Mendapatkan user_id dari request setelah verifikasi token
    const user_id = req.userId;
    const user = await db.user.findByPk(user_id);
    if (!user) {
      return res.status(404).send({ message: "Pengguna tidak ditemukan." });
    }

    const mosque_id = user.mosque_id; // Ambil mosque_id dari data user

    const article = await Content.findOne({
      where: {
        contents_id: id,
        mosque_id,
      },
    });

    if (!article) {
      return res.status(404).send({ message: "Artikel tidak ditemukan." });
    }

    res.status(200).send({
      message: "Artikel ditemukan.",
      data: article,
    });
  } catch (err) {
    console.error("Error saat mengambil artikel:", err);
    res.status(500).send({ message: "Terjadi kesalahan saat mengambil artikel." });
  }
};

// GET all contents by mosque_id (untuk guest)
exports.getPublicContents = async (req, res) => {
  try {
    const { mosque_id } = req.params;
    const { search = "", sortBy = "published_date", order = "ASC" } = req.query;

    const contents = await Content.findAndCountAll({
      where: {
        mosque_id,
        [Op.or]: [
          {
            title: {
              [Op.like]: `%${search}%`,
            },
          },
          {
            content_description: {
              [Op.like]: `%${search}%`,
            },
          },
        ],
      },
      order: [[sortBy, order]],
    });

    res.status(200).send({
      data: contents.rows,
      totalCount: contents.count,
    });
  } catch (err) {
    console.error("Error mengambil artikel publik:", err);
    res.status(500).send({ message: "Gagal mengambil artikel publik." });
  }
};


// GET single content by ID (untuk guest)
exports.getPublicContentById = async (req, res) => {
  try {
    const { id, mosque_id } = req.params;

    const article = await Content.findOne({
      where: {
        contents_id: id,
        mosque_id,
      },
    });

    if (!article) {
      return res.status(404).send({ message: "Artikel tidak ditemukan." });
    }

    res.status(200).send({
      message: "Artikel ditemukan.",
      data: article,
    });
  } catch (err) {
    console.error("Error mengambil artikel publik:", err);
    res.status(500).send({ message: "Gagal mengambil artikel publik." });
  }
};

exports.getPublicRecentNews = async (req, res) => {
  try {
    // Cari masjid berdasarkan slug untuk mendapatkan ID-nya
    const mosque = await db.mosques.findOne({ where: { slug: req.params.slug } });
    if (!mosque) {
      return res.status(404).json({ message: "Masjid tidak ditemukan." });
    }

    const recentNews = await Content.findAll({
      where: {
        mosque_id: mosque.mosque_id,
        // Filter hanya untuk 'berita'
        contents_type: 'berita',
      },
      order: [['published_date', 'DESC']], // Urutkan dari yang terbaru
      limit: 4 // Ambil 4 berita terbaru
    });

    // Format data agar mudah digunakan di frontend
    const formattedNews = recentNews.map(news => {
      // Membuat excerpt (ringkasan) dari deskripsi
      const excerpt = news.content_description
        ? news.content_description.split(' ').slice(0, 20).join(' ') + '...'
        : 'Klik untuk membaca selengkapnya.';

      return {
        id: news.contents_id,
        img: news.image ? `${req.protocol}://${req.get('host')}/uploads/${news.image}` : 'https://placehold.co/600x400/EBF1F4/888?text=Berita',
        title: news.title,
        date: new Date(news.published_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        excerpt: excerpt
      };
    });

    res.json(formattedNews);

  } catch (error) {
    console.error("Error fetching recent news:", error);
    res.status(500).json({ message: "Gagal mengambil berita terbaru" });
  }
};