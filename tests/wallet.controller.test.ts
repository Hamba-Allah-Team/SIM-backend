const { createWallet, getWalletById, getWalletsByMosqueId, deleteWallet } = require("../controllers/wallet.controller");
const db = require("../models");
const financeUtils = require("../utils/finance");

jest.mock("../models", () => ({
    Sequelize: {
        eq: Symbol("eq"),
        gte: Symbol("gte"),
        lt: Symbol("lt"),
        ne: Symbol("ne"),
    },
    wallet: {
        findOne: jest.fn(),
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        count: jest.fn(),
    },
    wallet_transaction: {
        create: jest.fn(),
    },
}));

jest.mock("../utils/finance", () => ({
    recalculateWalletBalances: jest.fn(),
}));

describe("Wallet Controller - createWallet", () => {
    let res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    const baseReq = {
        body: {
            mosque_id: 1,
            wallet_type: "bank",
            wallet_name: "Bank Syariah",
            initial_balance: 100000,
        },
        userId: 99,
    };

    it("should create wallet and initial balance transaction", async () => {
        db.wallet.findOne.mockResolvedValue(null);
        db.wallet.create.mockResolvedValue({ wallet_id: 1 });
        db.wallet_transaction.create.mockResolvedValue({});
        financeUtils.recalculateWalletBalances.mockResolvedValue();

        await createWallet(baseReq, res);

        expect(db.wallet.findOne).toHaveBeenCalledTimes(1); // ✅ fix dari 2 → 1
        expect(db.wallet.create).toHaveBeenCalledWith({
            mosque_id: 1,
            wallet_type: "bank",
            wallet_name: "Bank Syariah",
        });
        expect(db.wallet_transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                wallet_id: 1,
                amount: 100000,
                transaction_type: "initial_balance",
                source_or_usage: "Saldo awal",
                user_id: 99,
            })
        );
        expect(financeUtils.recalculateWalletBalances).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
    });

    it("should return 400 if required fields are missing", async () => {
        const req = { body: {}, userId: null };
        await createWallet(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "mosque_id, wallet_type, and wallet_name are required.",
        });
    });

    it("should return 400 if wallet_type 'cash' already exists", async () => {
        const req = {
            body: {
                mosque_id: 1,
                wallet_type: "cash",
                wallet_name: "Kas Masjid",
            },
            userId: 1,
        };
        db.wallet.findOne.mockResolvedValueOnce({ wallet_id: 99 });

        await createWallet(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "A 'cash' wallet already exists for this mosque.",
        });
    });

    it("should return 400 if wallet_name already exists", async () => {
        db.wallet.findOne.mockResolvedValueOnce({ wallet_id: 2 }); // ✅ fix: langsung return

        await createWallet(baseReq, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "A wallet with this name already exists for this mosque.",
        });
    });

    it("should return 500 if error occurs", async () => {
        db.wallet.findOne.mockResolvedValue(null); // ✅ harus lewat pengecekan dulu
        db.wallet.create.mockRejectedValue(new Error("DB Error")); // ✅ error saat create

        await createWallet(baseReq, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: "DB Error",
        });
    });
});

describe("Wallet Controller", () => {
    let res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    describe("getWalletsByMosqueId", () => {
        it("should return wallets for given mosque ID", async () => {
            const req = { params: { mosqueId: "1" } };
            const mockWallets = [{ wallet_id: 1 }, { wallet_id: 2 }];
            db.wallet.findAll.mockResolvedValue(mockWallets);

            await getWalletsByMosqueId(req, res);

            expect(db.wallet.findAll).toHaveBeenCalledWith({ where: { mosque_id: "1" } });
            expect(res.json).toHaveBeenCalledWith(mockWallets);
        });

        it("should return 500 on error", async () => {
            const req = { params: { mosqueId: "1" } };
            db.wallet.findAll.mockRejectedValue(new Error("Database error"));

            await getWalletsByMosqueId(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Database error" });
        });
    });

    describe("getWalletById", () => {
        it("should return a wallet by ID", async () => {
            const req = { params: { id: "1" } };
            const mockWallet = { wallet_id: 1 };
            db.wallet.findByPk.mockResolvedValue(mockWallet);

            await getWalletById(req, res);

            expect(db.wallet.findByPk).toHaveBeenCalledWith("1");
            expect(res.json).toHaveBeenCalledWith(mockWallet);
        });

        it("should return 404 if wallet not found", async () => {
            const req = { params: { id: "999" } };
            db.wallet.findByPk.mockResolvedValue(null);

            await getWalletById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Wallet not found" });
        });

        it("should return 500 on error", async () => {
            const req = { params: { id: "1" } };
            db.wallet.findByPk.mockRejectedValue(new Error("DB Failure"));

            await getWalletById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "DB Failure" });
        });
    });
});

describe("Wallet Controller - deleteWallet", () => {
    let res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it("should return 404 if wallet not found", async () => {
        const req = { params: { id: "123" } };
        db.wallet.findByPk.mockResolvedValue(null);

        await deleteWallet(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Wallet not found" });
    });

    it("should return 400 if it's the last wallet", async () => {
        const mockWallet = {
            mosque_id: 1,
        };
        db.wallet.findByPk.mockResolvedValue(mockWallet);
        db.wallet.count.mockResolvedValue(1);

        const req = { params: { id: "123" } };

        await deleteWallet(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Cannot delete the last wallet. A mosque must have at least one wallet.",
        });
    });

    it("should delete wallet successfully", async () => {
        const destroyMock = jest.fn();
        const mockWallet = {
            mosque_id: 1,
            destroy: destroyMock,
        };
        db.wallet.findByPk.mockResolvedValue(mockWallet);
        db.wallet.count.mockResolvedValue(2); // > 1

        const req = { params: { id: "123" } };

        await deleteWallet(req, res);

        expect(destroyMock).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: "Wallet deleted successfully" });
    });

    it("should return 500 on error", async () => {
        const req = { params: { id: "123" } };
        db.wallet.findByPk.mockRejectedValue(new Error("DB Error"));

        await deleteWallet(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "DB Error" });
    });
});