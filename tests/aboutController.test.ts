const db = require("../models");
import { getAbout } from "../controllers/about.controller";

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
