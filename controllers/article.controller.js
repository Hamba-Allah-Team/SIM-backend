const db = require("../models");
const Content = db.contents;
const { Op } = require("sequelize");

// CREATE a new article
exports.createArticle = async (req, res) => {
  try {
    const { mosque_id, title, content_description, image, published_date, contents_type, user_id } = req.body;

    if (!mosque_id || !title || !published_date || !contents_type || !user_id) {
      return res.status(400).send({ message: "Mosque ID, judul, tanggal publikasi, jenis konten, dan user ID wajib diisi." });
    }

    const content = await Content.create({
      mosque_id,
      title,
      content_description,
      image,
      published_date,
      contents_type,
      user_id
    });

    res.status(201).send({
      message: "Artikel berhasil dibuat.",
      data: content
    });
  } catch (err) {
    console.error("Error saat membuat artikel:", err);
    res.status(500).send({ message: "Terjadi kesalahan saat membuat artikel." });
  }
};

// READ all articles with sorting, filtering, pagination
exports.getArticles = async (req, res) => {
  try {
    const { mosque_id, search, sortBy = "created_at", sortOrder = "DESC", limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (mosque_id) where.mosque_id = mosque_id;
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content_description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const validSortFields = ['created_at', 'title', 'published_date'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    const order = [[orderField, sortOrder]];

    const articles = await Content.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: db.mosques, as: 'mosque', attributes: ['name'] },
        { model: db.user, as: 'user', attributes: ['username'] }
      ]
    });

    res.status(200).send({
      total: articles.count,
      page: parseInt(page),
      articles: articles.rows
    });
  } catch (err) {
    res.status(500).send({ message: "Terjadi kesalahan saat mengambil artikel." });
  }
};

// READ a single article by ID
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Content.findByPk(id, {
      include: [
        { model: db.mosques, as: 'mosque', attributes: ['name', 'address'] },
        { model: db.user, as: 'user', attributes: ['username'] }
      ]
    });

    if (!article) {
      return res.status(404).send({ message: "Artikel tidak ditemukan." });
    }

    res.status(200).send({
      article
    });
  } catch (err) {
    res.status(500).send({ message: "Terjadi kesalahan saat mengambil detail artikel." });
  }
};

// UPDATE an article
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content_description, image, published_date, contents_type, mosque_id, user_id } = req.body;

    if (!title || !published_date || !contents_type) {
      return res.status(400).send({ message: "Judul, tanggal publikasi, dan jenis konten wajib diisi." });
    }

    const article = await Content.findByPk(id);
    if (!article) {
      return res.status(404).send({ message: "Artikel tidak ditemukan." });
    }

    await article.update({
      title,
      content_description,
      image,
      published_date,
      contents_type,
      mosque_id,
      user_id
    });

    res.status(200).send({ message: "Artikel berhasil diperbarui." });
  } catch (err) {
    res.status(500).send({ message: "Terjadi kesalahan saat memperbarui artikel." });
  }
};

// DELETE an article
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Content.findByPk(id);
    if (!article) {
      return res.status(404).send({ message: "Artikel tidak ditemukan." });
    }

    await article.destroy();

    res.status(200).send({ message: "Artikel berhasil dihapus." });
  } catch (err) {
    res.status(500).send({ message: "Terjadi kesalahan saat menghapus artikel." });
  }
};
