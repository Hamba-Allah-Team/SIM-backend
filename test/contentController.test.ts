const { createContent } = require("../controllers/content.controller");
const { updateContent } = require("../controllers/content.controller");
const db = require("../models");
const fs = require("fs");
const path = require("path");

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

