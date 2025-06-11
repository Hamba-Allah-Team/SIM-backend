const db = require("../models");
import axios from 'axios';
import { getAbout, updateAbout, getPublicMosqueBySlug, getPrayerTimesBySlug  } from "../controllers/about.controller";

const fs = require("fs");
const path = require("path");
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockReq = (slug?: string) => ({
  params: { slug },
});

const mockRes = (): any => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

jest.mock("fs");
jest.mock("path");
jest.mock('axios');
jest.mock("../models", () => ({
  user: { findByPk: jest.fn() },
  mosques: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
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

//  get mosque by slug for guest
describe("getPublicMosqueBySlug", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      params: {
        slug: "masjid-contoh",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it("should return mosque data if found", async () => {
    const mockMosque = {
      name: "Masjid Contoh",
      address: "Jl. Raya",
      description: "Deskripsi",
      image: "image.jpg",
      phone_whatsapp: "081234567890",
      email: "masjid@example.com",
      facebook: "fb.com/masjid",
      instagram: "ig.com/masjid",
      longitude: "112.1234",
      latitude: "-7.1234",
    };

    db.mosques.findOne.mockResolvedValue(mockMosque);

    await getPublicMosqueBySlug(req, res);

    expect(db.mosques.findOne).toHaveBeenCalledWith({
      where: { slug: "masjid-contoh" },
      attributes: [
        "name", "address", "description", "image",
        "phone_whatsapp", "email", "facebook", "instagram",
        "longitude", "latitude"
      ],
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ data: mockMosque });
  });

  it("should return 404 if mosque not found", async () => {
    db.mosques.findOne.mockResolvedValue(null);

    await getPublicMosqueBySlug(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Data masjid tidak ditemukan.",
    });
  });

  it("should return 500 if error occurs", async () => {
    db.mosques.findOne.mockRejectedValue(new Error("Database error"));

    await getPublicMosqueBySlug(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      message: "Gagal mengambil data masjid.",
    });
  });
});


describe('getPrayerTimesBySlug', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if slug is missing', async () => {
    const req = mockReq(undefined);
    const res = mockRes();

    await getPrayerTimesBySlug(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Slug masjid diperlukan." });
  });

  it('should return 404 if mosque not found', async () => {
    db.mosques.findOne.mockResolvedValue(null);
    const req = mockReq('masjid-xyz');
    const res = mockRes();

    await getPrayerTimesBySlug(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Masjid tidak ditemukan." });
  });

  it('should return 400 if mosque has no coordinates', async () => {
    db.mosques.findOne.mockResolvedValue({ latitude: null, longitude: null });
    const req = mockReq('masjid-xyz');
    const res = mockRes();

    await getPrayerTimesBySlug(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Data koordinat untuk masjid ini tidak tersedia." });
  });

  it('should return prayer times if everything is valid', async () => {
    const mockMosque = { latitude: -7.123, longitude: 112.123 };
    const mockResponse = {
      data: {
        code: 200,
        data: {
          timings: {
            Fajr: '04:30',
            Dhuhr: '11:45',
            Asr: '15:15',
            Maghrib: '17:50',
            Isha: '19:00',
          },
          date: {
            hijri: {
              day: '05',
              month: { en: 'Dhul-Hijjah' },
              year: '1445',
            },
          },
        },
      },
    };

    db.mosques.findOne.mockResolvedValue(mockMosque);
    mockedAxios.get.mockResolvedValue(mockResponse);

    const req = mockReq('masjid-xyz');
    const res = mockRes();

    await getPrayerTimesBySlug(req, res);

   expect(mockedAxios.get).toHaveBeenCalledWith(
    'http://api.aladhan.com/v1/timings',
    expect.objectContaining({
        params: expect.objectContaining({
        latitude: -7.123,
        longitude: 112.123,
        }),
    })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
        subuh: '04:30',
        dzuhur: '11:45',
        ashar: '15:15',
        maghrib: '17:50',
        isya: '19:00',
        tanggalHijriyah: '05 Dhul-Hijjah 1445',
    });
  });
});
