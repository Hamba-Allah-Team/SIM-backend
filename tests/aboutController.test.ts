const db = require("../models");
import { getAbout, updateAbout } from "../controllers/about.controller";

const fs = require("fs");
const path = require("path");

jest.mock("fs");
jest.mock("path");

jest.mock("../models", () => ({
  user: { findByPk: jest.fn() },
  mosques: { findByPk: jest.fn() }, 
}));

describe("getAbout", () => {
  let req, res;

  jest.spyOn(console, "error").mockImplementation(() => {});


  beforeEach(() => {
    req = { userId: 1 };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it("should return mosque data successfully", async () => {
    const fakeUser = { user_id: 10, mosque_id: 10 };
    const fakeMosque = { mosque_id: 10, name: "Masjid Contoh" };

    db.user.findByPk.mockResolvedValue(fakeUser);
    db.mosques.findByPk.mockResolvedValue(fakeMosque);

    await getAbout(req, res);

    expect(db.user.findByPk).toHaveBeenCalledWith(1);
    expect(db.mosques.findByPk).toHaveBeenCalledWith(10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ data: fakeMosque });
  });

  it("should return 404 if user not found", async () => {
    db.user.findByPk.mockResolvedValue(null);

    await getAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Pengguna tidak ditemukan.",
    });
  });

  it("should return 404 if mosque not found", async () => {
    db.user.findByPk.mockResolvedValue({ user_id: 10, mosque_id: 10 });
    db.mosques.findByPk.mockResolvedValue(null); // mosque tidak ditemukan

    await getAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Data masjid tidak ditemukan.",
    });
  });

  it("should handle internal server error", async () => {
    db.user.findByPk.mockRejectedValue(new Error("DB error"));

    await getAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      message: "Gagal mengambil data masjid.",
    });
  });
});

// update mosque
describe("updateAbout", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      userId: 1,
      body: {
        name: "Masjid Contoh",
        address: "Jl. Raya",
      },
      file: null,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Mock user & mosque
    db.user.findByPk.mockResolvedValue({ mosque_id: 123 });
    db.mosques.findByPk.mockResolvedValue({
      image: "lama.jpg",
      update: jest.fn().mockResolvedValue(true),
    });

    // Mock fs
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockImplementation(() => {});
  });

  it("should update successfully", async () => {
    await updateAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: "Profil masjid berhasil diperbarui.",
    });
  });

  it("should return 400 if email invalid", async () => {
    req.body.email = "salah@";
    await updateAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Format email tidak valid.",
    });
  });

  it("should return 400 if phone number invalid", async () => {
    req.body.phone_whatsapp = "123abc";
    await updateAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Nomor WhatsApp harus berupa angka dan minimal 10 digit.",
    });
  });

  it("should return 400 if longitude invalid", async () => {
    req.body.longitude = "abc";
    await updateAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Longitude harus berupa string angka desimal yang valid.",
    });
  });

  it("should return 400 if latitude invalid", async () => {
    req.body.latitude = "koordinat";
    await updateAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Latitude harus berupa string angka desimal yang valid.",
    });
  });

  it("should return 404 if user not found", async () => {
    db.user.findByPk.mockResolvedValue(null);
    await updateAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Pengguna tidak ditemukan.",
    });
  });

  it("should return 404 if mosque not found", async () => {
    db.mosques.findByPk.mockResolvedValue(null);
    await updateAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Data masjid tidak ditemukan.",
    });
  });

  it("should return 500 if update throws error", async () => {
    db.mosques.findByPk.mockRejectedValue(new Error("DB error"));
    await updateAbout(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      message: "Terjadi kesalahan saat memperbarui profil masjid.",
    });
  });
});