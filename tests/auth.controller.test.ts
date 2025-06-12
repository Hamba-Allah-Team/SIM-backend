// tests/auth.controller.test.ts

const db_mock_auth = {
  user: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  mosques: {
    create: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
};

const bcrypt_mock_auth = {
  hash: jest.fn(),
  compareSync: jest.fn(),
};

const jwt_mock_auth = {
  sign: jest.fn(),
};

const validator_mock_auth = {
  isEmail: jest.fn(),
};

jest.mock("../models", () => db_mock_auth);
jest.mock("bcryptjs", () => bcrypt_mock_auth);
jest.mock("jsonwebtoken", () => jwt_mock_auth);
jest.mock("validator", () => validator_mock_auth);

const { signup, signin, logout } = require("../controllers/auth.controller");

describe("Auth Controller Comprehensive Tests", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, cookies: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // SIGNUP

  describe("signup validation errors", () => {
    it("should return 400 if required fields are missing", async () => {
      req.body = {};
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Semua kolom wajib diisi." });
    });

    it("should return 400 if email invalid", async () => {
      req.body = { username: "u", email: "notemail", password: "12345678", name: "n" };
      validator_mock_auth.isEmail.mockReturnValue(false);
      await signup(req, res);
      expect(validator_mock_auth.isEmail).toHaveBeenCalledWith("notemail");
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Format email tidak valid." });
    });

    it("should return 400 if password less than 8 chars", async () => {
      req.body = { username: "u", email: "a@b.com", password: "123", name: "n" };
      validator_mock_auth.isEmail.mockReturnValue(true);
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Kata sandi minimal harus 8 karakter." });
    });

    it("should return 400 if role admin but mosque_name or mosque_address missing and no mosque_id", async () => {
      req.body = {
        username: "u",
        email: "a@b.com",
        password: "12345678",
        name: "n",
        role: "admin",
      };
      validator_mock_auth.isEmail.mockReturnValue(true);
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Nama dan alamat masjid wajib diisi untuk admin baru." });
    });
  });

  describe("signup email conflict", () => {
    it("should return 409 if email already registered", async () => {
      req.body = {
        username: "u",
        email: "a@b.com",
        password: "12345678",
        name: "n",
        role: "admin",
        mosque_name: "M",
        mosque_address: "A",
      };
      validator_mock_auth.isEmail.mockReturnValue(true);
      db_mock_auth.user.findOne.mockResolvedValue({ email: "a@b.com" });
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({ message: "Email sudah terdaftar." });
    });
  });

  describe("signup success with mosque creation", () => {
    it("should create user and mosque if mosque_id not provided", async () => {
      req.body = {
        username: "user1",
        email: "User1@Example.com",
        password: "pass1234",
        name: "User One",
        role: "admin",
        mosque_name: "Masjid Jaya",
        mosque_address: "Jl. Mawar",
      };
      validator_mock_auth.isEmail.mockReturnValue(true);
      db_mock_auth.user.findOne.mockResolvedValue(null);

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_auth.sequelize.transaction.mockResolvedValue(mockTransaction);

      bcrypt_mock_auth.hash.mockResolvedValue("hashed_password");

      const mockUserUpdate = jest.fn();
      db_mock_auth.user.create.mockResolvedValue({
        update: mockUserUpdate,
        role: "admin",
      });
      db_mock_auth.mosques.create.mockResolvedValue({ mosque_id: 10 });

      await signup(req, res);

      expect(db_mock_auth.user.findOne).toHaveBeenCalledWith({ where: { email: "user1@example.com" } });
      expect(bcrypt_mock_auth.hash).toHaveBeenCalledWith("pass1234", 10);
      expect(db_mock_auth.user.create).toHaveBeenCalled();
      expect(db_mock_auth.mosques.create).toHaveBeenCalledWith(
        { name: "Masjid Jaya", address: "Jl. Mawar" },
        { transaction: mockTransaction }
      );
      expect(mockUserUpdate).toHaveBeenCalledWith({ mosque_id: 10 }, { transaction: mockTransaction });
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({ message: "Pendaftaran pengguna berhasil!" });
    });
  });

  describe("signup success with mosque_id provided", () => {
    it("should create user without creating mosque if mosque_id provided", async () => {
      req.body = {
        username: "user2",
        email: "user2@example.com",
        password: "pass1234",
        name: "User Two",
        role: "admin",
        mosque_id: 5,
      };
      validator_mock_auth.isEmail.mockReturnValue(true);
      db_mock_auth.user.findOne.mockResolvedValue(null);

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_auth.sequelize.transaction.mockResolvedValue(mockTransaction);
      bcrypt_mock_auth.hash.mockResolvedValue("hashed_password");
      db_mock_auth.user.create.mockResolvedValue({ update: jest.fn(), role: "admin" });

      await signup(req, res);

      expect(db_mock_auth.mosques.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({ message: "Pendaftaran pengguna berhasil!" });
    });
  });

  describe("signup transaction rollback on error", () => {
    it("should rollback transaction and return 500 on error", async () => {
      req.body = {
        username: "user3",
        email: "user3@example.com",
        password: "pass1234",
        name: "User Three",
        role: "admin",
        mosque_name: "Masjid Baru",
        mosque_address: "Jl. Baru",
      };
      validator_mock_auth.isEmail.mockReturnValue(true);
      db_mock_auth.user.findOne.mockResolvedValue(null);

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_auth.sequelize.transaction.mockResolvedValue(mockTransaction);
      bcrypt_mock_auth.hash.mockRejectedValue(new Error("Hash error"));

      await signup(req, res);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("Hash error") })
      );
    });
  });

  // SIGNIN

  describe("signin validation errors", () => {
    it("should return 400 if email or password missing", async () => {
      req.body = {};
      await signin(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Email dan kata sandi wajib diisi." });
    });
  });

  describe("signin user not found", () => {
    it("should return 404 if user not found", async () => {
      req.body = { email: "a@b.com", password: "12345678" };
      db_mock_auth.user.findOne.mockResolvedValue(null);
      validator_mock_auth.isEmail.mockReturnValue(true);
      await signin(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ message: "Pengguna tidak ditemukan." });
    });
  });

  describe("signin user deleted", () => {
    it("should return 403 if user.deleted_at is set", async () => {
      req.body = { email: "a@b.com", password: "12345678" };
      db_mock_auth.user.findOne.mockResolvedValue({ deleted_at: true });
      validator_mock_auth.isEmail.mockReturnValue(true);
      await signin(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({
        accessToken: null,
        message: "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.",
      });
    });
  });

  describe("signin password invalid", () => {
    it("should return 401 if password invalid", async () => {
      const user = { password: "hashedpass", deleted_at: null, role: "admin", status: "active" };
      req.body = { email: "a@b.com", password: "wrongpass" };
      db_mock_auth.user.findOne.mockResolvedValue(user);
      validator_mock_auth.isEmail.mockReturnValue(true);
      bcrypt_mock_auth.compareSync.mockReturnValue(false);
      await signin(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ accessToken: null, message: "Kata sandi salah!" });
    });
  });

  describe("signin inactive admin", () => {
    it("should return 403 if admin status inactive", async () => {
      const user = { password: "hashedpass", deleted_at: null, role: "admin", status: "inactive" };
      req.body = { email: "a@b.com", password: "correctpass" };
      db_mock_auth.user.findOne.mockResolvedValue(user);
      validator_mock_auth.isEmail.mockReturnValue(true);
      bcrypt_mock_auth.compareSync.mockReturnValue(true);
      await signin(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({ accessToken: null, message: "Account Inactive" });
    });
  });

  describe("signin success", () => {
    it("should login user and set cookie", async () => {
      const user = {
        user_id: 99,
        username: "usr",
        email: "usr@example.com",
        password: "hashedpass",
        role: "admin",
        status: "active",
        deleted_at: null,
      };
      req.body = { email: "usr@example.com", password: "correctpass" };
      db_mock_auth.user.findOne.mockResolvedValue(user);
      validator_mock_auth.isEmail.mockReturnValue(true);
      bcrypt_mock_auth.compareSync.mockReturnValue(true);
      jwt_mock_auth.sign.mockReturnValue("jwt-token-xyz");

      process.env.JWT_SECRET = "secret";
      process.env.JWT_EXPIRATION = "1h";
      process.env.NODE_ENV = "development";

      await signin(req, res);

      expect(jwt_mock_auth.sign).toHaveBeenCalledWith({ id: 99 }, "secret", { expiresIn: "1h" });
      expect(res.cookie).toHaveBeenCalledWith("token", "jwt-token-xyz", expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: "Strict",
        maxAge: 3600000,
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        id: 99,
        username: "usr",
        email: "usr@example.com",
        message: "Login berhasil",
        token: "jwt-token-xyz",
        role: "admin",
      });
    });
  });

  describe("signin server error", () => {
    it("should return 500 on unexpected error", async () => {
      req.body = { email: "usr@example.com", password: "pass" };
      db_mock_auth.user.findOne.mockRejectedValue(new Error("DB Error"));
      await signin(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ message: "DB Error" });
    });
  });

  // LOGOUT

  describe("logout success", () => {
    it("should clear cookie and send success message", async () => {
      await logout(req, res);
      expect(res.clearCookie).toHaveBeenCalledWith("token");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ message: "Anda berhasil keluar." });
    });
  });

  describe("logout error", () => {
    it("should return 500 on error", async () => {
      res.clearCookie.mockImplementation(() => { throw new Error("fail"); });
      await logout(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ message: "fail" });
    });
  });
});
