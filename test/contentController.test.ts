const { createContent,  updateContent, deleteContent, getContents, getContentById, getPublicRecentNews} = require("../controllers/content.controller");
const db = require("../models");
const fs = require("fs");
const path = require("path");
const Content = db.contents;
const { Op } = require("sequelize");

jest.mock("../models");
jest.mock("fs");
jest.mock("path");

// create content
describe("createContent", () => {

    beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  let req, res;

  beforeEach(() => {
    req = {
      body: {
        title: "Lebaran Idul Adha",
        content_description: "Masjid Al Hikmah mengumumkan mendapat 5 hewan kurban, 3 sapi dan 2 kambing",
        published_date: "2025-06-10",
        contents_type: "Berita"
      },
      file: {
        mimetype: "image/jpeg",
        filename: "gambarSapi.jpg"
      },
      userId: 1
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
  });

  it("should create content successfully", async () => {
    const fakeUser = { id: 1, mosque_id: 1 };
    const fakeContent = { id: 10, title: req.body.title };

    db.user.findByPk.mockResolvedValue(fakeUser);
    db.contents.create.mockResolvedValue(fakeContent);

    await createContent(req, res);

    expect(db.user.findByPk).toHaveBeenCalledWith(1);
    expect(db.contents.create).toHaveBeenCalledWith({
      title: "Lebaran Idul Adha",
      content_description: "Masjid Al Hikmah mengumumkan mendapat 5 hewan kurban, 3 sapi dan 2 kambing",
      image: "gambarSapi.jpg",
      published_date: "2025-06-10",
      contents_type: "Berita",
      user_id: 1,
      mosque_id: 1,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      message: "Konten berhasil dibuat.",
      data: fakeContent
    });
  });

  it("should return 400 if required fields are missing", async () => {
    req.body.title = null;

    await createContent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Judul, tanggal publikasi, dan jenis konten wajib diisi."
    });
  });

  it("should return 400 for invalid image format", async () => {
    req.file.mimetype = "application/pdf";

    await createContent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG."
    });
  });

  it("should return 404 if user not found", async () => {
    db.user.findByPk.mockResolvedValue(null);

    await createContent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Pengguna tidak ditemukan."
    });
  });

  it("should handle internal server error", async () => {
    db.user.findByPk.mockRejectedValue(new Error("DB error"));

    await createContent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      message: "Terjadi kesalahan saat membuat konten."
    });
  });
});

// update content
describe("updateContent", () => {
  let req, res, fakeUser, fakeContent;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    req = {
      params: { id: "123" },
      body: {
        title: "Update Judul",
        content_description: "Deskripsi baru",
        published_date: "2025-06-11",
        contents_type: "Berita",
        deleteImage: "false",
      },
      file: {
        mimetype: "image/jpeg",
        filename: "gambarBaru.jpg",
      },
      userId: 1,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    fakeUser = { id: 1, mosque_id: 2 };
    fakeContent = {
      id: 123,
      image: "lama.jpg",
      mosque_id: 2,
      update: jest.fn().mockResolvedValue(true),
    };

    db.user.findByPk.mockResolvedValue(fakeUser);
    db.Content = { findByPk: jest.fn().mockResolvedValue(fakeContent) };

    // Dummy fs behavior
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockImplementation(() => {});
    path.join.mockImplementation((...args) => args.join("/"));
  });

  it("should update content successfully", async () => {
    await updateContent(req, res);

    expect(db.user.findByPk).toHaveBeenCalledWith(1);
    expect(db.Content.findByPk).toHaveBeenCalledWith("123");
    expect(fakeContent.update).toHaveBeenCalledWith({
      title: "Update Judul",
      content_description: "Deskripsi baru",
      image: "gambarBaru.jpg",
      published_date: "2025-06-11",
      contents_type: "Berita",
      user_id: 1,
      mosque_id: 2,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: "Konten berhasil diperbarui.",
      data: fakeContent,
    });
  });

  it("should return 400 if required fields are missing", async () => {
    req.body.title = null;

    await updateContent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Judul, tanggal publikasi, dan jenis konten wajib diisi.",
    });
  });

  it("should return 404 if user not found", async () => {
    db.user.findByPk.mockResolvedValue(null);

    await updateContent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Pengguna tidak ditemukan.",
    });
  });

  it("should return 404 if content not found", async () => {
    db.Content.findByPk.mockResolvedValue(null);

    await updateContent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Konten tidak ditemukan.",
    });
  });

  it("should return 403 if user is not authorized", async () => {
    fakeContent.mosque_id = 999; // beda masjid

    await updateContent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      message: "Anda tidak memiliki izin untuk mengedit konten ini.",
    });
  });

  it("should delete image if deleteImage is true", async () => {
    req.body.deleteImage = "true";
    req.file = null;

    await updateContent(req, res);

    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(fakeContent.update).toHaveBeenCalledWith(
      expect.objectContaining({ image: null })
    );
  });

  it("should return 400 for invalid image format", async () => {
    req.file.mimetype = "application/pdf";

    await updateContent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG.",
    });
  });

  it("should handle internal server error", async () => {
    db.user.findByPk.mockRejectedValue(new Error("DB Error"));

    await updateContent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      message: "Terjadi kesalahan saat memperbarui konten.",
    });
  });
});

// delete content
describe("deleteContent", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { id: "1" },
      userId: 10, 
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 404 if user is not found", async () => {
    db.user.findByPk.mockResolvedValue(null);

    await deleteContent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ message: "Pengguna tidak ditemukan." });
  });

  it("should delete content and return success message", async () => {
    const mockArticle = {
      id: 1,
      mosque_id: 1,
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    db.user.findByPk.mockResolvedValue({ id: 10, mosque_id: 1 });
    Content.findByPk.mockResolvedValue(mockArticle);

    await deleteContent(req, res);

    expect(mockArticle.destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ message: "Konten berhasil dihapus." });
  });

  it("should return 500 if unexpected error occurs", async () => {
    db.user.findByPk.mockRejectedValue(new Error("Unexpected error"));

    await deleteContent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ message: "Terjadi kesalahan saat menghapus konten." });
  });
});


// get all conten
describe("getContents", () => {

  let req, res;

    beforeEach(() => {
      req = {
        query: {
          search: "",
          sortBy: "published_date",
          order: "ASC",
        },
        userId: 1,
      };

      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
    });

  it("should return 404 if user is not found", async () => {
    db.user.findByPk.mockResolvedValue(null);

    await getContents(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ message: "Pengguna tidak ditemukan." });
  });

  it("should return filtered and sorted contents", async () => {
    db.user.findByPk.mockResolvedValue({ id: 1, mosque_id: 1 });

    const mockContents = [
      { id: 1, title: "A", content_description: "Deskripsi A" },
      { id: 2, title: "B", content_description: "Deskripsi B" },
    ];

    Content.findAll.mockResolvedValue(mockContents);

    req.query.search = "Deskripsi";
    req.query.sortBy = "title";
    req.query.order = "DESC";

    await getContents(req, res);

    expect(Content.findAll).toHaveBeenCalledWith({
      where: {
        mosque_id: 1,
        [Op.or]: [
          { title: { [Op.like]: `%Deskripsi%` } },
          { content_description: { [Op.like]: `%Deskripsi%` } },
        ],
      },
      order: [["title", "DESC"]],
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      data: mockContents,
      totalCount: mockContents.length,
    });
  });

  it("should return 500 if unexpected error occurs", async () => {
    db.user.findByPk.mockRejectedValue(new Error("Unexpected"));

    await getContents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ message: "Terjadi kesalahan saat mengambil konten." });
  });
});

// get content by id

let req, res;

beforeEach(() => {
  req = {
    params: { id: "1" },
    userId: 1,
  };

  res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
});

describe("getContentById", () => {
  it("should return 404 if user is not found", async () => {
    db.user.findByPk.mockResolvedValue(null);

    await getContentById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ message: "Pengguna tidak ditemukan." });
  });

  it("should return 404 if content is not found", async () => {
    db.user.findByPk.mockResolvedValue({ id: 1, mosque_id: 2 });
    Content.findOne.mockResolvedValue(null);

    await getContentById(req, res);

    expect(Content.findOne).toHaveBeenCalledWith({
      where: {
        contents_id: "1",
        mosque_id: 2,
      },
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ message: "Konten tidak ditemukan." });
  });

  it("should return content if found", async () => {
    const mockArticle = { id: 1, contents_id: "1", mosque_id: 2, title: "Test" };

    db.user.findByPk.mockResolvedValue({ id: 1, mosque_id: 2 });
    Content.findOne.mockResolvedValue(mockArticle);

    await getContentById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: "Konten ditemukan.",
      data: mockArticle,
    });
  });

  it("should return 500 if unexpected error occurs", async () => {
    db.user.findByPk.mockRejectedValue(new Error("Unexpected"));

    await getContentById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      message: "Terjadi kesalahan saat mengambil konten.",
    });
  });
});

// public recent news
describe("getPublicRecentNews", () => {

  
let req, res;

  beforeEach(() => {
    req = {
      params: { slug: "masjid-al-ikhlas" },
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:3000"),
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should return 404 if mosque is not found", async () => {
    db.mosques.findOne.mockResolvedValue(null);

    await getPublicRecentNews(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Masjid tidak ditemukan." });
  });

  it("should return empty array if mosque found but no news", async () => {
    db.mosques.findOne.mockResolvedValue({ mosque_id: 1 });
    Content.findAll.mockResolvedValue([]);

    await getPublicRecentNews(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should return formatted news list", async () => {
    const mockMosque = { mosque_id: 1 };
    const mockNews = [
      {
        contents_id: 1,
        image: "news1.jpg",
        title: "Judul Berita",
        published_date: new Date("2024-06-10T10:00:00Z"),
        content_description: "Ini adalah berita terbaru tentang kegiatan masjid yang sangat menarik dan penuh hikmah.",
      },
    ];

    db.mosques.findOne.mockResolvedValue(mockMosque);
    Content.findAll.mockResolvedValue(mockNews);

    await getPublicRecentNews(req, res);

    expect(res.json).toHaveBeenCalledWith([
      {
        id: 1,
        img: "http://localhost:3000/uploads/news1.jpg",
        title: "Judul Berita",
        date: "10 Juni 2024",
        excerpt: expect.stringContaining("Ini adalah berita terbaru"),
      },
    ]);
  });

  it("should return 500 if unexpected error occurs", async () => {
    db.mosques.findOne.mockRejectedValue(new Error("DB error"));

    await getPublicRecentNews(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Gagal mengambil berita terbaru" });
  });
});
