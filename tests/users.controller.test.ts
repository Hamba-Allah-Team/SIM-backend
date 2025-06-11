const db_mock_users = {
  user: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
  },
  mosques: {},
  Sequelize: {
    Op: {
      or: Symbol.for("or"),
      iLike: Symbol.for("iLike"),
      gte: Symbol.for("gte"),
      lte: Symbol.for("lte"),
    },
    fn: jest.fn((...args) => args.join("_")), 
    col: jest.fn((colName) => colName),
  },
};

const bcrypt_mock_users = {
  compare: jest.fn(),
  compareSync: jest.fn(),
  hashSync: jest.fn(),
};

const sendMail_mock_users = jest.fn();

const moment_mock_users = require("moment");
jest.mock("moment", () => {
  const originalMoment = jest.requireActual("moment");
  const mockDate = originalMoment("2025-06-11T17:00:00.000Z");

  const momentWrapper = (d) => originalMoment(d || mockDate.clone());
  momentWrapper.utc = originalMoment.utc;
  momentWrapper.fn = originalMoment.fn;

  return momentWrapper;
});

jest.mock("../models", () => db_mock_users);
jest.mock("bcryptjs", () => bcrypt_mock_users);
jest.mock("../utils/sendMail", () => ({ sendMail: sendMail_mock_users })); 

const userController = require("../controllers/users.controller");

describe("User Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      params: {},
      userId: 1, 
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getUsers", () => {
    it("should fetch users with default parameters", async () => {
      const mockUsers = { count: 1, rows: [{ id: 1, name: "Test User" }] };
      db_mock_users.user.findAndCountAll.mockResolvedValue(mockUsers);

      await userController.getUsers(req, res);

      expect(db_mock_users.user.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted_at: null },
          order: [["created_at", "DESC"]],
          limit: 10,
          offset: 0,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        total: mockUsers.count,
        page: 1,
        users: mockUsers.rows,
      });
    });

    it("should filter users by role, status, and search query", async () => {
      req.query = { role: "admin", status: "active", search: "test" };
      db_mock_users.user.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });

      await userController.getUsers(req, res);

      expect(db_mock_users.user.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deleted_at: null,
            role: "admin",
            status: "active",
            [db_mock_users.Sequelize.Op.or]: [
              { name: { [db_mock_users.Sequelize.Op.iLike]: `%test%` } },
              { email: { [db_mock_users.Sequelize.Op.iLike]: `%test%` } },
              { username: { [db_mock_users.Sequelize.Op.iLike]: `%test%` } },
            ],
          },
        })
      );
    });

    it("should handle server errors", async () => {
      const error = new Error("Database error");
      db_mock_users.user.findAndCountAll.mockRejectedValue(error);
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await userController.getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ message: error.message });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("profile", () => {
    it("should fetch the profile of the logged-in user", async () => {
      const mockProfile = { id: 1, name: "Current User" };
      db_mock_users.user.findByPk.mockResolvedValue(mockProfile);

      await userController.profile(req, res);

      expect(db_mock_users.user.findByPk).toHaveBeenCalledWith(
        req.userId,
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockProfile);
    });

    it("should return 404 if user not found", async () => {
      db_mock_users.user.findByPk.mockResolvedValue(null);
      await userController.profile(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "Pengguna tidak ditemukan.",
      });
    });
  });

  describe("updateUser", () => {
    it("should update user profile successfully", async () => {
      const mockUser = {
        user_id: 2,
        name: "Old Name",
        email: "old@example.com",
        update: jest.fn(),
      };
      const mockLoggedInUser = { role: "admin" };
      req.params.id = 2;
      req.body = {
        name: "New Name",
        email: "old@example.com",
        username: "newuser",
      };

      db_mock_users.user.findByPk.mockImplementation((id) => {
        if (id == req.params.id) return Promise.resolve(mockUser);
        if (id == req.userId) return Promise.resolve(mockLoggedInUser);
      });

      await userController.updateUser(req, res);

      expect(mockUser.update).toHaveBeenCalledWith({
        name: "New Name",
        username: "newuser",
        email: "old@example.com",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        message: "Profil berhasil diperbarui.",
      });
    });

    it("should return 404 if target user not found", async () => {
      req.params.id = 99;
      req.body = {
        name: "Any Name",
        email: "any@example.com",
        username: "anyuser",
      };
      db_mock_users.user.findByPk.mockResolvedValue(null);

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "Pengguna tidak ditemukan.",
      });
    });

    it("should return 400 if required fields are missing", async () => {
      req.body = { name: "Test" };
      await userController.updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Nama, email, dan username wajib diisi.",
      });
    });

    it("should return 400 if updated email is already in use", async () => {
      const targetUser = { user_id: 2, email: "original@example.com" };
      const existingUserWithEmail = { user_id: 3, email: "new@example.com" };
      req.params.id = 2;
      req.body = {
        name: "Test",
        email: "new@example.com",
        username: "testuser",
      };

      db_mock_users.user.findByPk.mockResolvedValue(targetUser);
      db_mock_users.user.findOne.mockResolvedValue(existingUserWithEmail);

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Email sudah digunakan oleh pengguna lain",
      });
    });

    it("should return 401 for wrong password when changing email", async () => {
      const mockUser = {
        user_id: 2,
        email: "old@example.com",
        update: jest.fn(),
      };
      const mockLoggedInUser = { password: "hashedpassword" };
      req.params.id = 2;
      req.body = {
        name: "Test",
        email: "new@example.com",
        username: "testuser",
        password: "wrongpassword",
      };

      db_mock_users.user.findByPk.mockImplementation((id) => {
        if (id == req.params.id) return Promise.resolve(mockUser);
        if (id == req.userId) return Promise.resolve(mockLoggedInUser);
      });
      db_mock_users.user.findOne.mockResolvedValue(null);
      bcrypt_mock_users.compare.mockResolvedValue(false);

      await userController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        message: "Password tidak valid",
      });
    });
  });

  describe("changePassword", () => {
    const mockUser = {
      password: "oldHashedPassword",
      save: jest.fn(),
    };

    it("should change password successfully", async () => {
      req.body = {
        currentPassword: "old",
        newPassword: "newpassword123",
        confirmNewPassword: "newpassword123",
      };
      db_mock_users.user.findByPk.mockResolvedValue(mockUser);
      bcrypt_mock_users.compareSync.mockReturnValue(true);
      bcrypt_mock_users.hashSync.mockReturnValue("newHashedPassword");

      await userController.changePassword(req, res);

      expect(bcrypt_mock_users.compareSync).toHaveBeenCalledWith(
        "old",
        "oldHashedPassword"
      );
      expect(bcrypt_mock_users.hashSync).toHaveBeenCalledWith(
        "newpassword123",
        8
      );
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        message: "Kata sandi berhasil diperbarui.",
      });
    });

    it("should return 401 for incorrect current password", async () => {
      req.body = {
        currentPassword: "wrong",
        newPassword: "newpassword123",
        confirmNewPassword: "newpassword123",
      };
      db_mock_users.user.findByPk.mockResolvedValue(mockUser);
      bcrypt_mock_users.compareSync.mockReturnValue(false); 

      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        message: "Kata sandi saat ini salah.",
      });
    });

    it("should return 400 if new passwords do not match", async () => {
      req.body = {
        currentPassword: "old",
        newPassword: "newpassword1",
        confirmNewPassword: "newpassword2",
      };
      await userController.changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Konfirmasi kata sandi tidak cocok.",
      });
    });
  });

  describe("softDeleteUser", () => {
    it("should soft delete a user successfully", async () => {
      const mockUser = {
        deleted_at: null,
        update: jest.fn(),
      };
      req.params.id = 2;
      db_mock_users.user.findByPk.mockResolvedValue(mockUser);

      await userController.softDeleteUser(req, res);

      expect(mockUser.update).toHaveBeenCalledWith({
        deleted_at: expect.any(Date),
        status: "inactive",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        message: "Pengguna berhasil dihapus sementara.",
      });
    });

    it("should return 404 if user to delete is not found", async () => {
      req.params.id = 99;
      db_mock_users.user.findByPk.mockResolvedValue(null);

      await userController.softDeleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "Pengguna tidak ditemukan.",
      });
    });
  });

  describe("getAdminActivityTrend", () => {
    it("should fetch trend for the last 7 days", async () => {
      req.query.period = "7d";
      db_mock_users.user.findAll.mockResolvedValue([
        { date_group: "2025-06-08T00:00:00.000Z", activeCount: "2" },
        { date_group: "2025-06-10T00:00:00.000Z", activeCount: "1" },
      ]);

      await userController.getAdminActivityTrend(req, res);

      const expectedEndDate = moment_mock_users().endOf("day").toDate();
      const expectedStartDate = moment_mock_users()
        .subtract(6, "days")
        .startOf("day")
        .toDate();

      expect(db_mock_users.user.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: {
              [db_mock_users.Sequelize.Op.gte]: expectedStartDate,
              [db_mock_users.Sequelize.Op.lte]: expectedEndDate,
            },
          }),
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith([
        { date: "06 Jun", active: 0 },
        { date: "07 Jun", active: 0 },
        { date: "08 Jun", active: 2 },
        { date: "09 Jun", active: 0 },
        { date: "10 Jun", active: 1 },
        { date: "11 Jun", active: 0 },
        { date: "12 Jun", active: 0 },
      ]);
    });

    it("should fetch trend for the last 12 months", async () => {
      req.query.period = "12m";
      db_mock_users.user.findAll.mockResolvedValue([
        { date_group: "2024-07-01T00:00:00.000Z", activeCount: "5" },
        { date_group: "2025-05-01T00:00:00.000Z", activeCount: "3" },
      ]);

      await userController.getAdminActivityTrend(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith([
        { date: "Juli", active: 5 },
        { date: "Agustus", active: 0 },
        { date: "September", active: 0 },
        { date: "Oktober", active: 0 },
        { date: "November", active: 0 },
        { date: "Desember", active: 0 },
        { date: "Januari", active: 0 },
        { date: "Februari", active: 0 },
        { date: "Maret", active: 0 },
        { date: "April", active: 0 },
        { date: "Mei", active: 3 },
        { date: "Juni", active: 0 },
      ]);
    });

    it("should return 400 for an invalid period", async () => {
      req.query.period = "1y";
      await userController.getAdminActivityTrend(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Periode tidak valid.",
      });
    });
  });
});
