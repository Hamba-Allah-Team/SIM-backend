
const {
  createReservation,
  getReservations,
  getReservationById,
  updateReservation,
  approveReservation,
  deleteReservation,
  createPublicReservation,
} = require("../controllers/reservation.controller");

const db = require("../models");
const Reservation = db.reservation;
const { Op } = require("sequelize");

// Gunakan auto-mocking yang lebih andal. Ini sudah benar.
jest.mock("../models");

// Helper untuk membuat objek 'res' yang lengkap setiap saat
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res); // <-- Pastikan .json() selalu ada
  return res;
};


describe("Reservation Controller", () => {
  // Sembunyikan console.error untuk output test yang bersih
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Membersihkan semua mock setelah setiap test
    jest.clearAllMocks();
  });

  //==================================//
  //  createReservation
  //==================================//
describe("createReservation", () => {
    let req;
    const res = mockResponse(); // Use the helper for a clean 'res' object each time

    // A valid user and request body for the happy path
    const mockAdminUser = { id: 1, mosque_id: 10, role: "admin" };
    const validRequestBody = {
        room_id: 1,
        title: "Rapat Bulanan DKM",
        name: "Ahmad Fauzi",
        phone_number: "+6281234567890",
        description: "Membahas rencana kegiatan.",
        reservation_date: "2025-07-20",
        start_time: "09:00:00",
        end_time: "11:00:00",
    };

    beforeEach(() => {
        // Reset request object before each test
        req = {
            body: { ...validRequestBody },
            userId: 1,
        };
        // Clear mocks before each test
        jest.clearAllMocks();
    });

    it("should create a reservation successfully for an admin", async () => {
        db.user.findByPk.mockResolvedValue(mockAdminUser);
        Reservation.findOne.mockResolvedValue(null); // No conflicting reservation
        Reservation.create.mockResolvedValue({ id: 5, ...req.body });

        await createReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            message: "Reservasi berhasil dibuat.",
            data: expect.any(Object),
        }));
    });

    it("should return 403 if the user is not an admin", async () => {
        const mockNonAdminUser = { id: 2, mosque_id: 10, role: "user" };
        db.user.findByPk.mockResolvedValue(mockNonAdminUser);

        await createReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
    });

    it("should return 400 if required fields are missing", async () => {
        req.body.title = null; // Make the request invalid
        db.user.findByPk.mockResolvedValue(mockAdminUser);

        await createReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Semua field wajib diisi." });
    });

    it("should return 400 if start_time is after end_time", async () => {
        req.body.start_time = "11:00:00";
        req.body.end_time = "09:00:00";
        db.user.findByPk.mockResolvedValue(mockAdminUser);
        
        await createReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Waktu mulai harus lebih awal dari waktu selesai." });
    });

    it("should return 400 if a conflicting reservation exists", async () => {
        db.user.findByPk.mockResolvedValue(mockAdminUser);
        // Simulate finding an existing reservation in the same time slot
        Reservation.findOne.mockResolvedValue({ id: 99, title: "Existing Event" });

        await createReservation(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Reservasi sudah ada pada waktu tersebut." });
    });
    
    it("should return 500 on a server error", async () => {
        db.user.findByPk.mockRejectedValue(new Error("Database connection lost"));

        await createReservation(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Terjadi kesalahan saat membuat reservasi" });
    });
});

  //==================================//
  //  getReservations
  //==================================//
describe("getReservations", () => {
    let req;
    // highlight-start
    const res = mockResponse(); // <-- Use the complete mock helper
    // highlight-end

    beforeEach(() => {
        req = {
            query: { search: "", filter: "all", sortOrder: "DESC", limit: 10, page: 1 },
            userId: 1,
        };
    });

    it("should get all reservations successfully", async () => {
        const mockUser = { id: 1, mosque_id: 10, role: 'admin' };
        const mockReservations = [{ id: 1, title: 'Test' }];
    // highlight-start
        db.user.findByPk.mockResolvedValue(mockUser);
        Reservation.findAndCountAll.mockResolvedValue({ // Use Reservation model directly
            count: 1,
            rows: mockReservations.map(r => ({ get: () => r }))
        });

    await getReservations(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ data: mockReservations }));
    });
});

  //==================================//
  //  getReservationById
  //==================================//
  describe("getReservationById", () => {
      let req, res;
      beforeEach(() => {
          req = { params: { id: "1" }, userId: 1 };
          res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      });

      it("should return a reservation if found", async () => {
          const mockReservation = { reservation_id: 1, title: "Rapat" };
          db.user.findByPk.mockResolvedValue({ id: 1, role: 'admin' });
          Reservation.findOne.mockResolvedValue(mockReservation);

          await getReservationById(req, res);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ data: mockReservation }));
      });
  });

  //==================================//
  //  updateReservation
  //==================================//
  describe("updateReservation", () => {
      let req, res;
      const mockExistingReservation = {
          reservation_id: 1, mosque_id: 10, status: 'pending',
          update: jest.fn().mockResolvedValue(true)
      };

      beforeEach(() => {
          req = {
              params: { id: "1" },
              body: { room_id: 1, title: "Updated Rapat" },
              userId: 1
          };
          res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };
          db.user.findByPk.mockResolvedValue({ id: 1, mosque_id: 10, role: 'admin' });
      });

      it("should update a reservation successfully", async () => {
          Reservation.findOne
              .mockResolvedValueOnce(mockExistingReservation) 
              .mockResolvedValueOnce(null); 

          await updateReservation(req, res);
          expect(mockExistingReservation.update).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(200);
      });
  });

  //==================================//
  //  approveReservation
  //==================================//
  describe("approveReservation", () => {
      let req, res;
      const mockPendingReservation = {
          reservation_id: 1, status: 'pending', mosque_id: 10,
          update: jest.fn().mockResolvedValue(true)
      };

      beforeEach(() => {
          req = { params: { id: 1, status: 'approved' }, userId: 1 };
          res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
          db.user.findByPk.mockResolvedValue({ id: 1, mosque_id: 10, role: 'admin' });
      });

      it("should approve a pending reservation", async () => {
          Reservation.findOne.mockResolvedValue(mockPendingReservation);
          await approveReservation(req, res);
          expect(mockPendingReservation.update).toHaveBeenCalledWith({ status: 'approved', admin_id: 1 });
          expect(res.status).toHaveBeenCalledWith(200);
      });
  });

  //==================================//
  //  deleteReservation
  //==================================//
  describe("deleteReservation", () => {
      it("should delete reservation successfully", async () => {
          const req = { params: { id: "1" }, userId: 1 };
          const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

          db.user.findByPk.mockResolvedValue({ id: 1, mosque_id: 10, role: 'admin' });
          Reservation.findOne.mockResolvedValue({ id: 1, mosque_id: 10 });
          Reservation.destroy.mockResolvedValue(1);

          await deleteReservation(req, res);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith({ message: "Reservasi berhasil dihapus." });
      });
  });
  
  //==================================//
  //  createPublicReservation
  //==================================//
  describe("createPublicReservation", () => {
      let req, res;
      beforeEach(() => {
          req = {
              body: {
                  slug: "masjid-agung", room_id: 1, title: "Kajian Publik", name: "Jamaah", 
                  phone_number: "+6285712345678", description: "Kajian umum", 
                  reservation_date: "2025-09-10", start_time: "19:00:00", end_time: "21:00:00"
              }
          };
          res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };
          
          // Definisikan ulang Mocks secara eksplisit untuk test block ini
          db.mosques = { findOne: jest.fn() };
          // Remove db.reservation mocks, use imported Reservation mocks instead
          Reservation.findOne = jest.fn();
          Reservation.create = jest.fn();
      });
      
      it("should create a public reservation successfully", async () => {
          const mockCreatedReservation = { id: 1, ...req.body };

          db.mosques.findOne.mockResolvedValue({ mosque_id: 1 });
          // Make sure no conflicting reservation exists
          Reservation.findOne.mockResolvedValue(null);
          Reservation.create.mockResolvedValue(mockCreatedReservation);

          await createPublicReservation(req, res);

          expect(db.mosques.findOne).toHaveBeenCalledWith({ where: { slug: "masjid-agung" } });
          expect(Reservation.findOne).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(201);
          expect(res.send).toHaveBeenCalledWith({
              message: "Reservasi berhasil dibuat.",
              data: mockCreatedReservation
          });
      });

      it("should return 404 if mosque not found", async () => {
          db.mosques.findOne.mockResolvedValue(null);
          await createPublicReservation(req, res);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith({ message: "Masjid tidak ditemukan." });
      });
  });
});

