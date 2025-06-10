const { createContent } = require("../controllers/content.controller");
const db = require("../models");

jest.mock("../models"); // Mock seluruh model

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
