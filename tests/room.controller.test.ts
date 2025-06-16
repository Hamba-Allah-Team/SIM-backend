const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  getPublicRooms,
  getPublicRoomById,
} = require("../controllers/room.controller");
const db = require("../models");
const Room = db.reservation_room;
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

// Mock modul-modul yang dibutuhkan
jest.mock("../models", () => ({
  // Kita perlu bisa memanggil jest.fn() pada properti secara dinamis
  // Jadi kita gunakan Proxy untuk mencegat pemanggilan properti
  user: { findByPk: jest.fn() },
  reservation_room: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
  },
  mosques: { findOne: jest.fn() },
  reservation: {}, // Placeholder
  Op: {
    iLike: Symbol("iLike"), // Mocking Sequelize operators
  },
}));
jest.mock("fs");
jest.mock("path");

// Helper untuk membuat mock req dan res
type MockFile = { mimetype: string; filename: string } | null;

const mockRequest = (
  body: any = {},
  params: any = {},
  query: any = {},
  file: MockFile = null,
  userId: any = null
) => ({
  body,
  params,
  query,
  file,
  userId,
});

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// =============================================
//               CREATE ROOM
// =============================================
describe("createRoom", () => {
  let req, res;
  const mockAdminUser = { id: 1, role: "admin", mosque_id: 10 };

  beforeEach(() => {
    // Menyembunyikan console.error selama tes untuk output yang lebih bersih
    jest.spyOn(console, "error").mockImplementation(() => {});

    req = mockRequest(
      {
        place_name: "Aula Serbaguna",
        description: "Aula besar untuk berbagai acara.",
        facilities: "AC, Sound System, Proyektor",
        capacity: 200,
      },
      {},
      {},
      {
        mimetype: "image/jpeg",
        filename: "aula.jpg",
      },
      mockAdminUser.id
    );

    res = mockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a room successfully with an image", async () => {
    const fakeCreatedRoom = { id: 1, ...req.body, image: "aula.jpg" };

    db.user.findByPk.mockResolvedValue(mockAdminUser);
    Room.findOne.mockResolvedValue(null); // Ruangan belum ada
    Room.create.mockResolvedValue(fakeCreatedRoom);

    await createRoom(req, res);

    expect(db.user.findByPk).toHaveBeenCalledWith(mockAdminUser.id);
    expect(Room.findOne).toHaveBeenCalledWith({
      where: {
        mosque_id: mockAdminUser.mosque_id,
        place_name: req.body.place_name,
      },
    });
    expect(Room.create).toHaveBeenCalledWith({
      ...req.body,
      mosque_id: mockAdminUser.mosque_id,
      image: req.file.filename,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      message: "Ruangaan berhasil dibuat.",
      data: fakeCreatedRoom,
    });
  });

  it("should return 403 if user is not an admin", async () => {
    const fakeNonAdminUser = { id: 2, role: "user", mosque_id: 10 };
    db.user.findByPk.mockResolvedValue(fakeNonAdminUser);

    await createRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      message: "Akses ditolak. Hanya Admin yang bisa mengakses",
    });
  });

  it("should return 400 if required fields are missing", async () => {
    db.user.findByPk.mockResolvedValue(mockAdminUser);

    req.body.place_name = null;
    await createRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Nama ruangan, deskripsi, fasilitas, dan kapasitas wajib diisi.",
    });
  });

  it("should return 400 for invalid image format", async () => {
    req.file.mimetype = "image/gif";
    db.user.findByPk.mockResolvedValue(mockAdminUser);

    await createRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG.",
    });
  });

  it("should return 400 if room already exists", async () => {
    db.user.findByPk.mockResolvedValue(mockAdminUser);
    Room.findOne.mockResolvedValue({ id: 99, place_name: req.body.place_name }); // Ruangan sudah ada

    await createRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Room already exists" });
  });

  it("should handle internal server error", async () => {
    db.user.findByPk.mockRejectedValue(new Error("DB Error"));

    await createRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Terjadi kesalahan saat membuat ruangan",
    });
  });
});

// =============================================
//               GET ROOMS
// =============================================
describe("getRooms", () => {
  let req, res;
  const mockAdminUser = { id: 1, role: "admin", mosque_id: 10 };

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    req = mockRequest(
      {},
      {},
      { page: "1", limit: "10", search: "aula", order: "DESC" },
      null,
      mockAdminUser.id
    );
    res = mockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return paginated and filtered rooms successfully", async () => {
    const mockRoomList = {
      count: 1,
      rows: [{ id: 1, place_name: "Aula Serbaguna" }],
    };

    db.user.findByPk.mockResolvedValue(mockAdminUser);
    Room.findAndCountAll.mockResolvedValue(mockRoomList);

    await getRooms(req, res);

    expect(Room.findAndCountAll).toHaveBeenCalledWith({
      where: {
        mosque_id: mockAdminUser.mosque_id,
        deleted_at: null,
        place_name: { [Op.iLike]: `%${req.query.search}%` },
      },
      order: [["place_name", "DESC"]],
      limit: 10,
      offset: 0,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      data: mockRoomList.rows,
      totalCount: mockRoomList.count,
      totalPages: 1,
      currentPage: 1,
    });
  });

  it("should return 404 if user not found", async () => {
    db.user.findByPk.mockResolvedValue(null);
    await getRooms(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Pengguna tidak ditemukan.",
    });
  });

  it("should handle internal server error", async () => {
    db.user.findByPk.mockRejectedValue(new Error("DB Error"));
    await getRooms(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      mesage: "Terjadi kesalahan saat mengambil daftar ruangan",
    });
  });
});

// =============================================
//               UPDATE ROOM
// =============================================
describe("updateRoom", () => {
  let req, res, mockAdminUser, existingRoom;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockAdminUser = { id: 1, role: "admin", mosque_id: 10 };
    existingRoom = {
      room_id: 1,
      place_name: "Nama Lama",
      image: "lama.jpg",
      mosque_id: 10,
    };

    req = mockRequest(
      {
        place_name: "Nama Baru",
        description: "Deskripsi baru",
        facilities: "Fasilitas baru",
        capacity: 150,
        delete_image: "false",
      },
      { id: "1" },
      {},
      { mimetype: "image/jpeg", filename: "baru.jpg" },
      mockAdminUser.id
    );
    res = mockResponse();

    db.user.findByPk.mockResolvedValue(mockAdminUser);
    Room.findByPk.mockResolvedValue(existingRoom);
    Room.update.mockResolvedValue([1]); // 1 row updated
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockImplementation(() => {});
    path.join.mockImplementation((...args) => args.join("/"));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update room and replace image successfully", async () => {
    await updateRoom(req, res);

    expect(Room.findByPk).toHaveBeenCalledWith("1");
    expect(fs.existsSync).toHaveBeenCalledWith(
      expect.stringContaining(existingRoom.image)
    );
    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(Room.update).toHaveBeenCalledWith(
      {
        place_name: "Nama Baru",
        description: "Deskripsi baru",
        facilities: "Fasilitas baru",
        capacity: 150,
        image: "baru.jpg",
      },
      {
        where: {
          room_id: "1",
          mosque_id: mockAdminUser.mosque_id,
          deleted_at: null,
        },
      }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: "Ruangan berhasil diperbarui.",
      data: [1],
    });
  });

  it("should delete image if delete_image is true", async () => {
    req.body.delete_image = "true";
    req.file = null;

    await updateRoom(req, res);

    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining(existingRoom.image)
    );
    expect(Room.update).toHaveBeenCalledWith(
      expect.objectContaining({ image: "default_room.png" }),
      expect.any(Object)
    );
  });

  it("should return 404 if room not found", async () => {
    Room.findByPk.mockResolvedValue(null);
    await updateRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Ruangan tidak ditemukan.",
    });
  });

  it("should return 403 if user is not authorized to edit", async () => {
    existingRoom.mosque_id = 99; // Masjid yang berbeda
    Room.findByPk.mockResolvedValue(existingRoom);

    await updateRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      message: "Anda tidak memiliki izin untuk mengedit ruangan ini.",
    });
  });
});

// =============================================
//               DELETE ROOM
// =============================================
describe("deleteRoom", () => {
  let req, res, mockAdminUser, existingRoom;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockAdminUser = { id: 1, role: "admin", mosque_id: 10 };
    existingRoom = { room_id: 1, place_name: "Ruangan Hapus", mosque_id: 10 };

    req = mockRequest({}, { id: "1" }, {}, null, mockAdminUser.id);
    res = mockResponse();

    db.user.findByPk.mockResolvedValue(mockAdminUser);
    Room.findByPk.mockResolvedValue(existingRoom);
    Room.update.mockResolvedValue([1]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should soft delete a room successfully", async () => {
    await deleteRoom(req, res);

    expect(Room.update).toHaveBeenCalledWith(
      { deleted_at: expect.any(Date) },
      {
        where: {
          room_id: "1",
          mosque_id: mockAdminUser.mosque_id,
          deleted_at: null,
        },
      }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: "Ruangan berhasil dihapus.",
      data: existingRoom,
    });
  });

  it("should return 404 if room to delete is not found", async () => {
    Room.findByPk.mockResolvedValue(null);
    await deleteRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Ruangan tidak ditemukan.",
    });
  });

  it("should return 403 if user is not authorized to delete", async () => {
    existingRoom.mosque_id = 99; // Masjid yang berbeda
    await deleteRoom(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      message: "Anda tidak memiliki izin untuk menghapus ruangan ini.",
    });
  });
});

// =============================================
//            GET PUBLIC ROOMS
// =============================================
describe("getPublicRooms", () => {
  let req, res;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    req = mockRequest({}, { slug: "masjid-agung" });
    res = mockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return a list of public rooms for a given mosque slug", async () => {
    const mockMosque = { mosque_id: 1, slug: "masjid-agung" };
    const mockRooms = [
      { id: 1, place_name: "Room A" },
      { id: 2, place_name: "Room B" },
    ];

    db.mosques.findOne.mockResolvedValue(mockMosque);
    Room.findAll.mockResolvedValue(mockRooms);

    await getPublicRooms(req, res);

    expect(db.mosques.findOne).toHaveBeenCalledWith({
      where: { slug: "masjid-agung" },
    });
    expect(Room.findAll).toHaveBeenCalledWith({
      where: { mosque_id: mockMosque.mosque_id, deleted_at: null },
      order: [["room_id", "ASC"]],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ data: mockRooms });
  });

  it("should return 404 if mosque not found", async () => {
    db.mosques.findOne.mockResolvedValue(null);
    await getPublicRooms(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Masjid tidak ditemukan.",
    });
  });
});

// =============================================
//            GET PUBLIC ROOM BY ID
// =============================================
describe("getPublicRoomById", () => {
  let req, res;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    req = mockRequest({}, { slug: "masjid-agung", room_id: "1" });
    res = mockResponse();
    // Mock toJSON method to simplify assertion
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return public room details successfully", async () => {
    const mockMosque = { mosque_id: 1, slug: "masjid-agung" };
    const mockRoomDetail = {
      room_id: 1,
      place_name: "Aula Utama",
      reservations: [],
      toJSON: () => mockRoomDetail, // mock toJSON
    };

    db.mosques.findOne.mockResolvedValue(mockMosque);
    Room.findOne.mockResolvedValue(mockRoomDetail);

    await getPublicRoomById(req, res);

    expect(Room.findOne).toHaveBeenCalledWith({
      where: {
        room_id: "1",
        mosque_id: mockMosque.mosque_id,
        deleted_at: null,
      },
      include: [
        {
          model: db.reservation,
          as: "reservations",
          attributes: [
            "title",
            "reservation_date",
            "start_time",
            "end_time",
            "status",
          ],
        },
      ],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      message: "Detail ruangan ditemukan.",
      data: mockRoomDetail,
    });
  });

  it("should return 404 if room not found", async () => {
    const mockMosque = { mosque_id: 1, slug: "masjid-agung" };
    db.mosques.findOne.mockResolvedValue(mockMosque);
    Room.findOne.mockResolvedValue(null); // Ruangan tidak ada

    await getPublicRoomById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Ruangan tidak ditemukan.",
    });
  });
});
