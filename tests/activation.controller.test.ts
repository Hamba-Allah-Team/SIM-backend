const db_mock_activation = {
  user: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  activations: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
  },
  mosques: {
    create: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
    Op: {
      or: Symbol.for("or"),
      in: Symbol.for("in"),
      iLike: Symbol.for("iLike"),
    },
  },
};

const bcrypt_mock_activation = {
  hashSync: jest.fn(),
};

const mail_mock = {
  sendMail: jest.fn(),
};

jest.mock("../models", () => db_mock_activation);
jest.mock("bcryptjs", () => bcrypt_mock_activation);
jest.mock("../utils/sendMail", () => mail_mock);

const {
  submitActivationRequest,
  processActivationRequest,
  submitExtensionRequest,
  processExtensionRequest,
  getActivationRequests,
  getActivationRequestById,
  getExtensionRequests,
  getExtensionRequestById,
} = require("../controllers/activation.controller");

describe("Activation Controller Comprehensive Tests", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      file: {
        filename: "proof.jpg",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();

    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    db_mock_activation.sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  describe("submitActivationRequest", () => {
    it("should return 400 if required fields are missing", async () => {
      req.body = {};
      await submitActivationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "All required fields must be filled!",
      });
    });

    it("should return 400 if proof image is missing", async () => {
      req.body = {
        username: "user",
        email: "user@test.com",
        password: "pass123",
        proof_number: "123",
        type: "activation",
      };
      req.file = null;
      await submitActivationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Proof image is required!",
      });
    });

    it("should return 400 if type is not activation", async () => {
      req.body = {
        username: "user",
        email: "user@test.com",
        password: "pass123",
        proof_number: "123",
        type: "invalid",
      };
      await submitActivationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Invalid activation type!",
      });
    });

    it("should return 400 if username or email already exists", async () => {
      req.body = {
        username: "user",
        email: "user@test.com",
        password: "pass123",
        proof_number: "123",
        type: "activation",
      };
      db_mock_activation.user.findOne.mockResolvedValue({
        username: "user",
      });
      await submitActivationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Username or email already exists!",
      });
    });

    it("should return 400 if pending activation exists", async () => {
      req.body = {
        username: "user",
        email: "user@test.com",
        password: "pass123",
        proof_number: "123",
        type: "activation",
      };
      db_mock_activation.user.findOne.mockResolvedValue(null);
      db_mock_activation.activations.findOne.mockResolvedValue({
        username: "user",
      });
      await submitActivationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message:
          "An activation request with this username or email already exists or is being processed.",
      });
    });

    it("should return 400 if partial mosque data provided", async () => {
      req.body = {
        username: "user",
        email: "user@test.com",
        password: "pass123",
        proof_number: "123",
        type: "activation",
        mosque_name: "Mosque",
      };
      db_mock_activation.user.findOne.mockResolvedValue(null);
      db_mock_activation.activations.findOne.mockResolvedValue(null);
      await submitActivationRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message:
          "Mosque name and address are required if mosque data is provided.",
      });
    });

    it("should create activation request successfully", async () => {
      req.body = {
        username: "user",
        email: "User@Test.com",
        password: "pass123",
        proof_number: "123",
        type: "activation",
        mosque_name: "Mosque",
        mosque_address: "Address",
      };

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_activation.sequelize.transaction.mockResolvedValue(
        mockTransaction
      );
      db_mock_activation.user.findOne.mockResolvedValue(null);
      db_mock_activation.activations.findOne.mockResolvedValue(null);
      bcrypt_mock_activation.hashSync.mockReturnValue("hashed_password");
      db_mock_activation.activations.create.mockResolvedValue({
        activation_id: 1,
      });

      await submitActivationRequest(req, res);

      expect(db_mock_activation.user.findOne).toHaveBeenCalledWith({
        where: {
          [db_mock_activation.sequelize.Op.or]: [
            {
              username: "user",
            },
            {
              email: "user@test.com",
            },
          ],
        },
        transaction: mockTransaction,
      });
      expect(bcrypt_mock_activation.hashSync).toHaveBeenCalledWith(
        "pass123",
        10
      );
      expect(db_mock_activation.activations.create).toHaveBeenCalledWith(
        {
          username: "user",
          email: "user@test.com",
          password: "hashed_password",
          proof_number: "123",
          proof_image: "proof.jpg",
          activation_type: "activation",
          status: "pending",
          mosque_name: "Mosque",
          mosque_address: "Address",
        },
        {
          transaction: mockTransaction,
        }
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should handle errors during activation submission", async () => {
      // TAMBAHKAN INI: Bungkam console.error untuk tes ini
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      req.body = {
        username: "user",
        email: "user@test.com",
        password: "pass123",
        proof_number: "123",
        type: "activation",
      };

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_activation.sequelize.transaction.mockResolvedValue(
        mockTransaction
      );
      db_mock_activation.user.findOne.mockRejectedValue(new Error("DB Error"));

      await submitActivationRequest(req, res);

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);

      consoleSpy.mockRestore();
    });
  });

  describe("processActivationRequest", () => {
    it("should return 404 if activation not found", async () => {
      req.params.id = "1";
      req.body.action = "approve";
      db_mock_activation.activations.findByPk.mockResolvedValue(null);

      await processActivationRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "Request not found.",
      });
    });

    it("should return 400 if activation already processed", async () => {
      req.params.id = "1";
      req.body.action = "approve";
      db_mock_activation.activations.findByPk.mockResolvedValue({
        status: "approved",
      });

      await processActivationRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "This request has already been processed.",
      });
    });

    it("should return 400 if invalid action", async () => {
      req.params.id = "1";
      req.body.action = "invalid";
      db_mock_activation.activations.findByPk.mockResolvedValue({
        status: "pending",
      });

      await processActivationRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Invalid action.",
      });
    });

    it("should approve activation and create user/mosque", async () => {
      req.params.id = "1";
      req.body.action = "approve";

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_activation.sequelize.transaction.mockResolvedValue(
        mockTransaction
      );

      const activationData = {
        activation_id: 1,
        status: "pending",
        username: "user",
        email: "user@test.com",
        password: "hashed_pass",
        proof_number: "123",
        proof_image: "proof.jpg",
        mosque_name: "Mosque",
        mosque_address: "Address",
        update: jest.fn(),
      };
      db_mock_activation.activations.findByPk.mockResolvedValue(activationData);

      const mockMosque = {
        mosque_id: 1,
      };
      db_mock_activation.mosques.create.mockResolvedValue(mockMosque);

      const mockUser = {
        user_id: 1,
      };
      db_mock_activation.user.create.mockResolvedValue(mockUser);

      await processActivationRequest(req, res);

      expect(db_mock_activation.mosques.create).toHaveBeenCalledWith(
        {
          name: "Mosque",
          address: "Address",
        },
        {
          transaction: mockTransaction,
        }
      );

      expect(db_mock_activation.user.create).toHaveBeenCalledWith(
        {
          username: "user",
          email: "user@test.com",
          password: "hashed_pass",
          name: "user",
          role: "admin",
          status: "active",
          mosque_id: 1,
          extension_code: "123",
          expired_at: expect.any(Date),
        },
        {
          transaction: mockTransaction,
        }
      );

      expect(activationData.update).toHaveBeenCalledWith(
        {
          status: "approved",
          approved_at: expect.any(Date),
          user_id: 1,
          mosque_id: 1,
        },
        {
          transaction: mockTransaction,
        }
      );

      expect(mail_mock.sendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should reject activation request", async () => {
      req.params.id = "1";
      req.body.action = "reject";

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_activation.sequelize.transaction.mockResolvedValue(
        mockTransaction
      );

      const activationData = {
        activation_id: 1,
        status: "pending",
        username: "user",
        email: "user@test.com",
        update: jest.fn(),
      };
      db_mock_activation.activations.findByPk.mockResolvedValue(activationData);

      await processActivationRequest(req, res);

      expect(activationData.update).toHaveBeenCalledWith(
        {
          status: "rejected",
          approved_at: expect.any(Date),
        },
        {
          transaction: mockTransaction,
        }
      );

      expect(mail_mock.sendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("submitExtensionRequest", () => {
    it("should return 400 if required fields are missing", async () => {
      req.body = {};
      await submitExtensionRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "All fields are required!",
      });
    });

    it("should return 400 if proof image is missing", async () => {
      req.body = {
        username: "user",
        email: "user@test.com",
        proof_number: "123",
        type: "extension",
      };
      req.file = null;
      await submitExtensionRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Proof image is required!",
      });
    });

    it("should return 400 if type is not extension", async () => {
      req.body = {
        username: "user",
        email: "user@test.com",
        proof_number: "123",
        type: "invalid",
      };
      await submitExtensionRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Invalid extension type!",
      });
    });

    it("should return 404 if user not found", async () => {
      req.body = {
        username: "user",
        email: "user@test.com",
        proof_number: "123",
        type: "extension",
      };
      db_mock_activation.user.findOne.mockResolvedValue(null);
      await submitExtensionRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "User not found.",
      });
    });

    it("should create extension request successfully", async () => {
      req.body = {
        username: "user",
        email: "User@Test.com",
        proof_number: "123",
        type: "extension",
      };

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_activation.sequelize.transaction.mockResolvedValue(
        mockTransaction
      );
      db_mock_activation.user.findOne.mockResolvedValue({
        user_id: 1,
      });
      db_mock_activation.activations.create.mockResolvedValue({
        activation_id: 1,
      });

      await submitExtensionRequest(req, res);

      expect(db_mock_activation.activations.create).toHaveBeenCalledWith(
        {
          username: "user",
          email: "user@test.com",
          proof_number: "123",
          proof_image: "proof.jpg",
          activation_type: "extension",
          status: "pending",
          user_id: 1,
        },
        {
          transaction: mockTransaction,
        }
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("processExtensionRequest", () => {
    it("should return 400 if action missing", async () => {
      req.params.id = "1";
      req.body = {};
      await processExtensionRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Missing action in request body.",
      });
    });

    it("should return 404 if extension not found", async () => {
      req.params.id = "1";
      req.body.action = "approve";
      db_mock_activation.activations.findByPk.mockResolvedValue(null);
      await processExtensionRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "Extension request not found.",
      });
    });

    it("should return 400 if extension already processed", async () => {
      req.params.id = "1";
      req.body.action = "approve";
      db_mock_activation.activations.findByPk.mockResolvedValue({
        status: "approved",
      });
      await processExtensionRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "This extension request has already been processed.",
      });
    });

    it("should return 404 if user not found", async () => {
      req.params.id = "1";
      req.body.action = "approve";
      db_mock_activation.activations.findByPk.mockResolvedValue({
        status: "pending",
        user_id: 1,
      });
      db_mock_activation.user.findOne.mockResolvedValue(null);
      await processExtensionRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "Associated user not found.",
      });
    });

    it("should approve extension request", async () => {
      req.params.id = "1";
      req.body.action = "approve";

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_activation.sequelize.transaction.mockResolvedValue(
        mockTransaction
      );

      const extensionData = {
        activation_id: 1,
        status: "pending",
        user_id: 1,
        proof_number: "123",
        username: "user",
        email: "user@test.com",
        update: jest.fn(),
      };
      db_mock_activation.activations.findByPk.mockResolvedValue(extensionData);

      const userData = {
        user_id: 1,
        expired_at: new Date(),
        save: jest.fn(),
      };
      db_mock_activation.user.findOne.mockResolvedValue(userData);

      await processExtensionRequest(req, res);

      expect(userData.expired_at).toBeInstanceOf(Date);
      expect(userData.save).toHaveBeenCalledWith({
        transaction: mockTransaction,
      });
      expect(extensionData.update).toHaveBeenCalledWith(
        {
          status: "approved",
          approved_at: expect.any(Date),
          user_id: 1,
        },
        {
          transaction: mockTransaction,
        }
      );
      expect(mail_mock.sendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should reject extension request", async () => {
      req.params.id = "1";
      req.body.action = "reject";

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };
      db_mock_activation.sequelize.transaction.mockResolvedValue(
        mockTransaction
      );

      const extensionData = {
        activation_id: 1,
        status: "pending",
        user_id: 1,
        username: "user",
        email: "user@test.com",
        update: jest.fn(),
      };
      db_mock_activation.activations.findByPk.mockResolvedValue(extensionData);

      await processExtensionRequest(req, res);

      expect(extensionData.update).toHaveBeenCalledWith(
        {
          status: "rejected",
          processed_at: expect.any(Date),
        },
        {
          transaction: mockTransaction,
        }
      );
      expect(mail_mock.sendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getActivationRequests", () => {
    it("should fetch activation requests with default parameters", async () => {
      const mockRequests = {
        count: 2,
        rows: [
          {
            activation_id: 1,
            activation_type: "activation",
          },
          {
            activation_id: 2,
            activation_type: "activation",
          },
        ],
      };
      db_mock_activation.activations.findAndCountAll.mockResolvedValue(
        mockRequests
      );

      await getActivationRequests(req, res);

      expect(
        db_mock_activation.activations.findAndCountAll
      ).toHaveBeenCalledWith({
        where: {
          activation_type: "activation",
        },
        order: [["createdAt", "DESC"]],
        limit: 20,
        offset: 0,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should filter activation requests by status", async () => {
      req.query.status = "pending";
      const mockRequests = {
        count: 1,
        rows: [
          {
            activation_id: 1,
            activation_type: "activation",
            status: "pending",
          },
        ],
      };
      db_mock_activation.activations.findAndCountAll.mockResolvedValue(
        mockRequests
      );

      await getActivationRequests(req, res);

      expect(
        db_mock_activation.activations.findAndCountAll
      ).toHaveBeenCalledWith({
        where: {
          activation_type: "activation",
          status: "pending",
        },
        order: [["createdAt", "DESC"]],
        limit: 20,
        offset: 0,
      });
    });

    it("should search activation requests", async () => {
      req.query.search = "test";
      const mockRequests = {
        count: 1,
        rows: [
          {
            activation_id: 1,
            username: "testuser",
          },
        ],
      };
      db_mock_activation.activations.findAndCountAll.mockResolvedValue(
        mockRequests
      );

      await getActivationRequests(req, res);

      expect(
        db_mock_activation.activations.findAndCountAll
      ).toHaveBeenCalledWith({
        where: {
          activation_type: "activation",
          [db_mock_activation.sequelize.Op.or]: [
            {
              username: {
                [db_mock_activation.sequelize.Op.iLike]: "%test%",
              },
            },
            {
              email: {
                [db_mock_activation.sequelize.Op.iLike]: "%test%",
              },
            },
            {
              proof_number: {
                [db_mock_activation.sequelize.Op.iLike]: "%test%",
              },
            },
          ],
        },
        order: [["createdAt", "DESC"]],
        limit: 20,
        offset: 0,
      });
    });
  });

  describe("getActivationRequestById", () => {
    it("should return 404 if activation not found", async () => {
      req.params.id = "1";
      db_mock_activation.activations.findOne.mockResolvedValue(null);

      await getActivationRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "Activation request not found.",
      });
    });

    it("should return activation request by ID", async () => {
      req.params.id = "1";
      const mockRequest = {
        activation_id: 1,
        activation_type: "activation",
      };
      db_mock_activation.activations.findOne.mockResolvedValue(mockRequest);

      await getActivationRequestById(req, res);

      expect(db_mock_activation.activations.findOne).toHaveBeenCalledWith({
        where: {
          activation_id: "1",
          activation_type: "activation",
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        activation: mockRequest,
      });
    });
  });

  describe("getExtensionRequests", () => {
    it("should fetch extension requests with default parameters", async () => {
      const mockRequests = {
        count: 2,
        rows: [
          {
            activation_id: 1,
            activation_type: "extension",
          },
          {
            activation_id: 2,
            activation_type: "extension",
          },
        ],
      };
      db_mock_activation.activations.findAndCountAll.mockResolvedValue(
        mockRequests
      );

      await getExtensionRequests(req, res);

      expect(
        db_mock_activation.activations.findAndCountAll
      ).toHaveBeenCalledWith({
        where: {
          activation_type: "extension",
        },
        order: [["createdAt", "DESC"]],
        limit: 20,
        offset: 0,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getExtensionRequestById", () => {
    it("should return 404 if extension not found", async () => {
      req.params.id = "1";
      db_mock_activation.activations.findOne.mockResolvedValue(null);

      await getExtensionRequestById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: "Extension request not found.",
      });
    });

    it("should return extension request by ID", async () => {
      req.params.id = "1";
      const mockRequest = {
        activation_id: 1,
        activation_type: "extension",
      };
      db_mock_activation.activations.findOne.mockResolvedValue(mockRequest);

      await getExtensionRequestById(req, res);

      expect(db_mock_activation.activations.findOne).toHaveBeenCalledWith({
        where: {
          activation_id: "1",
          activation_type: "extension",
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        extension: mockRequest,
      });
    });
  });
});
