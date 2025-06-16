import { Op } from "sequelize";
const moment = require("moment");
import { createTransaction, getAllTransactions, transferBetweenWallets, getTransactionById, updateTransaction, deleteTransaction, getWalletsByMosqueWithBalance, getFinancialSummaryForDashboard, getLineStats, getPeriodicReportExport, getRecentTransactions, getTopCategories, getPublicFinancialSummary } from "../controllers/wallet_transaction.controller";
const db = require("../models");
const financeUtils = require("../utils/finance");
const mockPipe = jest.fn();
const mockEnd = jest.fn();

jest.mock("pdfmake", () => {
    return jest.fn().mockImplementation(() => ({
        createPdfKitDocument: jest.fn(() => ({
            pipe: mockPipe,
            end: mockEnd
        }))
    }));
});

jest.mock("../models", () => {
    const actualSequelize = require("sequelize");
    return {
        user: {
            findByPk: jest.fn(),
        },
        wallet_transaction: {
            create: jest.fn(),
            findByPk: jest.fn(),
            findAll: jest.fn(),
        },
        transaction_category: {
            findByPk: jest.fn(),
        },
        wallet: {
            findByPk: jest.fn(),
            findAll: jest.fn(),
        },
        mosques: {
            findOne: jest.fn(),
        },
        Sequelize: {
            QueryTypes: { SELECT: 'SELECT' },
            fn: jest.fn(),
            col: jest.fn(),
            literal: jest.fn(),
            Op: actualSequelize.Op
        },
    };
});

jest.mock("../utils/finance", () => ({
    getCurrentWalletBalance: jest.fn(),
    recalculateWalletBalances: jest.fn(),
}));

describe("createTransaction", () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 1,
            body: {},
            query: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it("should return 400 if required fields are missing", async () => {
        await createTransaction(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Semua field wajib diisi." });
    });

    it("should return 400 if amount is invalid", async () => {
        req.body = {
            wallet_id: 1,
            amount: "0",
            transaction_type: "income",
            category_id: 1,
            source_or_usage: "test",
            transaction_date: "2024-01-01",
        };

        await createTransaction(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Nominal tidak valid. Harus lebih dari 0." });
    });

    it("should return 400 if category is not found", async () => {
        req.body = {
            wallet_id: 1,
            amount: "10000",
            transaction_type: "income",
            category_id: 1,
            source_or_usage: "test",
            transaction_date: "2024-01-01",
        };
        db.transaction_category.findByPk.mockResolvedValue(null);

        await createTransaction(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Kategori tidak ditemukan." });
    });

    it("should return 400 if category type mismatches transaction type", async () => {
        req.body = {
            wallet_id: 1,
            amount: "10000",
            transaction_type: "income",
            category_id: 1,
            source_or_usage: "test",
            transaction_date: "2024-01-01",
        };
        db.transaction_category.findByPk.mockResolvedValue({
            category_type: "expense",
        });

        await createTransaction(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: expect.stringContaining("Tipe kategori (expense) tidak sesuai dengan tipe transaksi (income)."),
        });
    });

    it("should return 400 if insufficient balance for expense", async () => {
        req.body = {
            wallet_id: 1,
            amount: "20000",
            transaction_type: "expense",
            category_id: 1,
            source_or_usage: "beli barang",
            transaction_date: "2024-01-01",
        };

        db.transaction_category.findByPk.mockResolvedValue({
            category_type: "expense",
        });

        financeUtils.getCurrentWalletBalance.mockResolvedValue(10000); // saldo kurang dari amount

        await createTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: expect.stringContaining("Saldo dompet tidak mencukupi"),
        });
    });

    it("should create transaction successfully", async () => {
        req.body = {
            wallet_id: 1,
            amount: "50000",
            transaction_type: "income",
            category_id: 1,
            source_or_usage: "donasi",
            transaction_date: "2024-01-01",
        };

        const mockTransaction = { transaction_id: 10, amount: 50000 };

        db.transaction_category.findByPk.mockResolvedValue({
            category_type: "income",
        });

        db.wallet_transaction.create.mockResolvedValue(mockTransaction);

        db.wallet_transaction.findByPk.mockResolvedValue({
            transaction_id: 10,
            amount: 50000,
            balance: 100000,
        });

        await createTransaction(req, res);

        expect(db.wallet_transaction.create).toHaveBeenCalled();
        expect(financeUtils.recalculateWalletBalances).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            transaction_id: 10,
            amount: 50000,
            balance: 100000,
        });
    });

    it("should return 500 on error", async () => {
        req.body = {
            wallet_id: 1,
            amount: "50000",
            transaction_type: "income",
            category_id: 1,
            source_or_usage: "donasi",
            transaction_date: "2024-01-01",
        };

        db.transaction_category.findByPk.mockRejectedValue(new Error("DB Error"));

        await createTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Gagal menambahkan transaksi" });
    });
});

describe("getAllTransactions", () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 1,
            query: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it("should return 404 if user not found", async () => {
        db.user.findByPk.mockResolvedValue(null);

        await getAllTransactions(req, res);

        expect(db.user.findByPk).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({ message: "Pengguna tidak ditemukan." });
    });

    it("should fetch cashflow transactions by default", async () => {
        db.user.findByPk.mockResolvedValue({ mosque_id: 10 });
        db.wallet_transaction.findAll.mockResolvedValue([{ transaction_id: 1 }]);

        await getAllTransactions(req, res);

        expect(db.wallet_transaction.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    transaction_type: { [require("sequelize").Op.in]: ["income", "expense"] }
                }),
                paranoid: true,
            })
        );
        expect(res.json).toHaveBeenCalledWith([{ transaction_id: 1 }]);
    });

    it("should fetch transfer transactions when type=transfer", async () => {
        req.query.type = "transfer";
        db.user.findByPk.mockResolvedValue({ mosque_id: 10 });
        db.wallet_transaction.findAll.mockResolvedValue([{ transaction_id: 2 }]);

        await getAllTransactions(req, res);

        expect(db.wallet_transaction.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    transaction_type: { [require("sequelize").Op.in]: ["transfer_in", "transfer_out"] }
                }),
            })
        );
        expect(res.json).toHaveBeenCalledWith([{ transaction_id: 2 }]);
    });

    it("should fetch all transaction types when type=all", async () => {
        req.query.type = "all";
        db.user.findByPk.mockResolvedValue({ mosque_id: 10 });
        db.wallet_transaction.findAll.mockResolvedValue([{ transaction_id: 3 }]);

        await getAllTransactions(req, res);

        const callArgs = db.wallet_transaction.findAll.mock.calls[0][0];
        expect(callArgs.where.transaction_type).toBeUndefined();
        expect(res.json).toHaveBeenCalledWith([{ transaction_id: 3 }]);
    });

    it("should include soft deleted transactions when includeDeleted=true", async () => {
        req.query.includeDeleted = "true";
        db.user.findByPk.mockResolvedValue({ mosque_id: 10 });
        db.wallet_transaction.findAll.mockResolvedValue([{ transaction_id: 4 }]);

        await getAllTransactions(req, res);

        expect(db.wallet_transaction.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                paranoid: false,
            })
        );
        expect(res.json).toHaveBeenCalledWith([{ transaction_id: 4 }]);
    });

    it("should return 500 on error", async () => {
        db.user.findByPk.mockRejectedValue(new Error("DB Error"));

        await getAllTransactions(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Failed to retrieve transactions" });
    });
});

describe("transferBetweenWallets", () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 1,
            body: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it("should return 400 if required fields are missing", async () => {
        await transferBetweenWallets(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Semua field wajib diisi." });
    });

    it("should return 400 if from_wallet and to_wallet are the same", async () => {
        req.body = {
            from_wallet_id: 1,
            to_wallet_id: 1,
            amount: "10000",
            transaction_date: "2024-01-01",
        };
        await transferBetweenWallets(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Wallet sumber dan tujuan tidak boleh sama." });
    });

    it("should return 400 if amount is invalid", async () => {
        req.body = {
            from_wallet_id: 1,
            to_wallet_id: 2,
            amount: "0",
            transaction_date: "2024-01-01",
        };
        await transferBetweenWallets(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Nominal tidak valid. Harus lebih dari 0." });
    });

    it("should return 404 if either wallet is not found", async () => {
        const req = {
            body: {
                from_wallet_id: 1,
                to_wallet_id: 2,
                amount: "50000",
                transaction_date: "2024-01-01",
                source_or_usage: "transfer saldo",
            },
            userId: 123,
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Simulasikan satu wallet tidak ditemukan (from_wallet)
        db.wallet.findByPk = jest.fn()
            .mockResolvedValueOnce(null) // from_wallet
            .mockResolvedValueOnce({ id: 2 }); // to_wallet

        await transferBetweenWallets(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "Wallet sumber atau tujuan tidak ditemukan.",
        });
    });

    it("should return 400 if balance is insufficient", async () => {
        const req = {
            body: {
                from_wallet_id: 1,
                to_wallet_id: 2,
                amount: "100000",
                transaction_date: "2024-01-01",
                source_or_usage: "transfer saldo",
            },
            userId: 123,
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        db.wallet.findByPk = jest.fn()
            .mockResolvedValueOnce({ id: 1 }) // from_wallet
            .mockResolvedValueOnce({ id: 2 }); // to_wallet

        financeUtils.getCurrentWalletBalance.mockResolvedValue(50000); // saldo tidak cukup

        await transferBetweenWallets(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: expect.stringContaining("Saldo dompet sumber tidak mencukupi"),
        });
    });

    it("should transfer successfully", async () => {
        const req = {
            body: {
                from_wallet_id: 1,
                to_wallet_id: 2,
                amount: "50000",
                transaction_date: "2024-01-01",
                source_or_usage: "transfer saldo",
            },
            userId: 123,
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        db.wallet.findByPk = jest.fn()
            .mockResolvedValueOnce({ id: 1 }) // from_wallet
            .mockResolvedValueOnce({ id: 2 }); // to_wallet

        financeUtils.getCurrentWalletBalance.mockResolvedValue(100000);

        const debitTx = { transaction_id: 101 };
        const creditTx = { transaction_id: 102 };

        db.wallet_transaction.create = jest.fn()
            .mockResolvedValueOnce(debitTx)
            .mockResolvedValueOnce(creditTx);

        db.wallet_transaction.findByPk = jest.fn()
            .mockResolvedValueOnce({ ...debitTx, balance: 50000 })
            .mockResolvedValueOnce({ ...creditTx, balance: 50000 });

        await transferBetweenWallets(req, res);

        expect(db.wallet_transaction.create).toHaveBeenCalledTimes(2);
        expect(financeUtils.recalculateWalletBalances).toHaveBeenCalledWith(1);
        expect(financeUtils.recalculateWalletBalances).toHaveBeenCalledWith(2);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            message: "Transfer berhasil dilakukan",
            debitTransaction: { ...debitTx, balance: 50000 },
            creditTransaction: { ...creditTx, balance: 50000 },
        });
    });

    it("should return 500 on error", async () => {
        req.body = {
            from_wallet_id: 1,
            to_wallet_id: 2,
            amount: "50000",
            transaction_date: "2024-01-01",
            source_or_usage: "error test",
        };

        db.wallet.findByPk.mockRejectedValue(new Error("DB Error"));

        await transferBetweenWallets(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Gagal melakukan transfer antar wallet" });
    });
});

describe("getTransactionById", () => {
    let req, res;

    beforeEach(() => {
        req = { params: { transactionId: "123" } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it("should return 404 if transaction not found", async () => {
        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue(null);

        await getTransactionById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Transaction not found" });
    });

    it("should return the transaction if found", async () => {
        const fakeTransaction = { transaction_id: 123, amount: 50000 };
        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue(fakeTransaction);

        await getTransactionById(req, res);

        expect(res.json).toHaveBeenCalledWith(fakeTransaction);
    });

    it("should return 500 if error occurs", async () => {
        db.wallet_transaction.findByPk = jest.fn().mockRejectedValue(new Error("DB error"));

        await getTransactionById(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Failed to fetch transaction" });
    });
});

describe("updateTransaction", () => {
    let req, res, t;

    beforeEach(() => {
        db.sequelize = { transaction: jest.fn() };
        req = {
            params: { transactionId: "1" },
            body: {
                wallet_id: 1,
                amount: 100000,
                transaction_type: "income",
                category_id: 1,
                source_or_usage: "donasi",
                transaction_date: "2025-06-10"
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        t = {
            commit: jest.fn(),
            rollback: jest.fn()
        };

        jest.clearAllMocks();
    });

    it("should return 404 if transaction not found", async () => {
        db.sequelize.transaction = jest.fn().mockResolvedValue(t);
        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue(null);

        await updateTransaction(req, res);

        expect(t.rollback).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Transaction not found" });
    });

    it("should return 400 if category not found", async () => {
        db.sequelize.transaction = jest.fn().mockResolvedValue(t);
        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue({
            wallet_id: 1,
            category_id: 1,
            transaction_type: "income"
        });
        db.transaction_category.findByPk = jest.fn().mockResolvedValue(null);

        await updateTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Kategori tidak ditemukan." });
    });

    it("should return 400 if category type mismatches", async () => {
        db.sequelize.transaction = jest.fn().mockResolvedValue(t);
        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue({
            wallet_id: 1,
            category_id: 1,
            transaction_type: "income"
        });
        db.transaction_category.findByPk = jest.fn().mockResolvedValue({
            category_type: "expense"
        });

        await updateTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Tipe kategori (expense) tidak sesuai dengan tipe transaksi (income)."
        });
    });

    it("should update transaction and commit if everything is valid", async () => {
        const fakeTransaction = {
            wallet_id: 1,
            update: jest.fn()
        };
        const fakeWallet = { wallet_id: 1, wallet_name: "Kas Masjid" };

        db.sequelize.transaction = jest.fn().mockResolvedValue(t);
        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue(fakeTransaction);
        db.transaction_category.findByPk = jest.fn().mockResolvedValue({ category_type: "income" });
        db.wallet.findByPk = jest.fn().mockResolvedValue(fakeWallet);
        financeUtils.recalculateWalletBalances.mockResolvedValue();
        financeUtils.getCurrentWalletBalance.mockResolvedValue(100000); // tidak negatif

        await updateTransaction(req, res);

        expect(fakeTransaction.update).toHaveBeenCalled();
        expect(financeUtils.recalculateWalletBalances).toHaveBeenCalledTimes(1); // hanya 1 wallet
        expect(t.commit).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: "Transaction and balances updated successfully" });
    });

    it("should rollback and return 400 if saldo negatif", async () => {
        const fakeTransaction = {
            wallet_id: 1,
            update: jest.fn()
        };
        const fakeWallet = { wallet_id: 1, wallet_name: "Kas Masjid" };

        db.sequelize.transaction = jest.fn().mockResolvedValue(t);
        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue(fakeTransaction);
        db.transaction_category.findByPk = jest.fn().mockResolvedValue({ category_type: "income" });
        db.wallet.findByPk = jest.fn().mockResolvedValue(fakeWallet);
        financeUtils.recalculateWalletBalances.mockResolvedValue();
        financeUtils.getCurrentWalletBalance.mockResolvedValue(-50000); // saldo negatif

        await updateTransaction(req, res);

        expect(t.rollback).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: `Gagal, update menyebabkan saldo Kas Masjid menjadi negatif.` });
    });

    it("should return 500 if an error occurs", async () => {
        db.sequelize.transaction = jest.fn().mockResolvedValue(t);
        db.wallet_transaction.findByPk = jest.fn().mockRejectedValue(new Error("Unexpected error"));

        await updateTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Failed to update transaction" });
    });
});

describe("deleteTransaction", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { transactionId: "1" }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    it("should return 404 if transaction not found", async () => {
        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue(null);

        await deleteTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Transaction not found" });
    });

    it("should soft delete transaction and update wallet balance", async () => {
        const fakeTransaction = {
            wallet_id: 1,
            destroy: jest.fn()
        };

        db.wallet_transaction.findByPk = jest.fn().mockResolvedValue(fakeTransaction);
        financeUtils.recalculateWalletBalances.mockResolvedValue();

        await deleteTransaction(req, res);

        expect(fakeTransaction.destroy).toHaveBeenCalled();
        expect(financeUtils.recalculateWalletBalances).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith({
            message: "Transaction soft-deleted and balances updated successfully"
        });
    });

    it("should return 500 if an error occurs", async () => {
        db.wallet_transaction.findByPk = jest.fn().mockRejectedValue(new Error("Unexpected error"));

        await deleteTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Failed to soft delete transaction"
        });
    });
});

describe("getWalletsByMosqueWithBalance", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { mosqueId: "1" }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    it("should return list of wallets with latest balance", async () => {
        const walletsMock = [
            {
                wallet_id: 1,
                mosque_id: 1,
                wallet_name: "Kas Masjid",
                wallet_type: "utama",
                transactions: [
                    { balance: "100000.00", transaction_date: "2025-06-10", transaction_id: 5 }
                ]
            },
            {
                wallet_id: 2,
                mosque_id: 1,
                wallet_name: "Kotak Infaq",
                wallet_type: "lainnya",
                transactions: []
            }
        ];

        db.wallet.findAll = jest.fn().mockResolvedValue(walletsMock);

        await getWalletsByMosqueWithBalance(req, res);

        expect(db.wallet.findAll).toHaveBeenCalledWith({
            where: { mosque_id: "1" },
            include: [
                {
                    model: db.wallet_transaction,
                    as: 'transactions',
                    attributes: ['balance', 'transaction_date', 'transaction_id'],
                    order: [
                        ['transaction_date', 'DESC'],
                        ['transaction_id', 'DESC']
                    ],
                    limit: 1,
                    separate: true
                }
            ]
        });

        expect(res.json).toHaveBeenCalledWith([
            {
                wallet_id: 1,
                mosque_id: 1,
                wallet_name: "Kas Masjid",
                wallet_type: "utama",
                balance: 100000
            },
            {
                wallet_id: 2,
                mosque_id: 1,
                wallet_name: "Kotak Infaq",
                wallet_type: "lainnya",
                balance: 0
            }
        ]);
    });

    it("should return 500 if an error occurs", async () => {
        db.wallet.findAll = jest.fn().mockRejectedValue(new Error("DB error"));

        await getWalletsByMosqueWithBalance(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Failed to fetch wallets with balances by mosque"
        });
    });
});

describe("getFinancialSummaryForDashboard", () => {
    let req, res;

    beforeEach(() => {
        req = { params: { mosqueId: "1" } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    it("should return financial summary with wallet balances", async () => {
        const walletMock = [
            { wallet_id: 1, wallet_name: "Kas Masjid", wallet_type: "utama" },
            { wallet_id: 2, wallet_name: "Kotak Infaq", wallet_type: "lainnya" }
        ];

        const summaryMock = {
            total_income: "500000.00",
            total_expense: "200000.00"
        };

        const transactionsMock = {
            1: { balance: "300000.00" },
            2: { balance: "150000.00" }
        };

        db.wallet.findAll = jest.fn().mockResolvedValue(walletMock);

        db.sequelize.query = jest.fn().mockResolvedValue([summaryMock]);

        db.wallet_transaction.findOne = jest
            .fn()
            .mockImplementation(({ where: { wallet_id } }) =>
                Promise.resolve(transactionsMock[wallet_id] || null)
            );

        await getFinancialSummaryForDashboard(req, res);

        console.log("Query mock called?", db.sequelize.query.mock.calls.length);

        expect(db.wallet.findAll).toHaveBeenCalledWith({
            where: { mosque_id: "1" },
            attributes: ["wallet_id", "wallet_name", "wallet_type"]
        });

        expect(db.sequelize.query).toHaveBeenCalled();

        expect(res.json).toHaveBeenCalledWith({
            total_income: 500000,
            total_expense: 200000,
            net_balance: 450000,
            wallet_balances: [
                {
                    wallet_id: 1,
                    wallet_name: "Kas Masjid",
                    wallet_type: "utama",
                    balance: "300000.00"
                },
                {
                    wallet_id: 2,
                    wallet_name: "Kotak Infaq",
                    wallet_type: "lainnya",
                    balance: "150000.00"
                }
            ]
        });
    });

    it("should return zero values if no wallets found", async () => {
        db.wallet.findAll = jest.fn().mockResolvedValue([]);

        await getFinancialSummaryForDashboard(req, res);

        expect(res.json).toHaveBeenCalledWith({
            total_income: 0,
            total_expense: 0,
            net_balance: 0,
            wallet_balances: []
        });
    });

    it("should handle errors and return 500", async () => {
        db.wallet.findAll = jest.fn().mockRejectedValue(new Error("Database error"));

        await getFinancialSummaryForDashboard(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Gagal mengambil ringkasan keuangan dashboard"
        });
    });
});

describe("getPublicFinancialSummary", () => {
    let req, res;

    beforeEach(() => {
        req = { params: { slug: "masjid-rahmat" } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        db.Sequelize = { QueryTypes: { SELECT: "SELECT" } };

        jest.clearAllMocks();
    });

    it("should return total pemasukan and pengeluaran", async () => {
        db.mosques.findOne = jest.fn().mockResolvedValue({ mosque_id: 1 });
        db.wallet.findAll = jest.fn().mockResolvedValue([
            { wallet_id: 1 },
            { wallet_id: 2 }
        ]);
        db.sequelize.query = jest.fn().mockResolvedValue([{
            total_income: "1000000",
            total_expense: "400000"
        }]);

        await getPublicFinancialSummary(req, res);

        expect(res.json).toHaveBeenCalledWith({
            pemasukan: 1000000,
            pengeluaran: 400000
        });
    });

    it("should return 404 if mosque not found", async () => {
        db.mosques.findOne = jest.fn().mockResolvedValue(null);

        await getPublicFinancialSummary(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "Masjid tidak ditemukan."
        });
    });

    it("should return 0 values if no wallets found", async () => {
        db.mosques.findOne = jest.fn().mockResolvedValue({ mosque_id: 1 });
        db.wallet.findAll = jest.fn().mockResolvedValue([]);

        await getPublicFinancialSummary(req, res);

        expect(res.json).toHaveBeenCalledWith({
            total_income: 0,
            total_expense: 0
        });
    });

    it("should handle errors and return 500", async () => {
        db.mosques.findOne = jest.fn().mockRejectedValue(new Error("DB error"));

        await getPublicFinancialSummary(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Gagal mengambil ringkasan keuangan"
        });
    });
});

describe("getRecentTransactions", () => {
    let req, res;

    beforeEach(() => {
        req = { params: { mosqueId: "1" } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    it("should return 5 recent income and expense transactions", async () => {
        // Mock wallet IDs
        const walletMock = [
            { wallet_id: 1 },
            { wallet_id: 2 }
        ];
        db.wallet.findAll = jest.fn().mockResolvedValue(walletMock);

        // Mock transactions
        const transactionMock = [
            {
                transaction_id: 101,
                transaction_date: "2025-06-10",
                transaction_type: "income",
                amount: 100000,
                source_or_usage: "Donasi Jumat",
                wallet: { wallet_name: "Kas Masjid" },
                category: { category_name: "Infaq" }
            },
            {
                transaction_id: 102,
                transaction_date: "2025-06-09",
                transaction_type: "expense",
                amount: 50000,
                source_or_usage: "Bayar Listrik",
                wallet: { wallet_name: "Kas Masjid" },
                category: { category_name: "Operasional" }
            }
        ];
        db.wallet_transaction.findAll = jest.fn().mockResolvedValue(transactionMock);

        await getRecentTransactions(req, res);

        expect(db.wallet.findAll).toHaveBeenCalledWith({
            where: { mosque_id: "1" },
            attributes: ["wallet_id"]
        });

        expect(db.wallet_transaction.findAll).toHaveBeenCalledWith({
            where: {
                wallet_id: { [Op.in]: [1, 2] },
                transaction_type: { [Op.in]: ['income', 'expense'] },
                deleted_at: null
            },
            include: [
                { model: db.wallet, as: 'wallet', attributes: ['wallet_name'] },
                { model: db.transaction_category, as: 'category', attributes: ['category_name'] }
            ],
            order: [['transaction_date', 'DESC'], ['created_at', 'DESC']],
            limit: 5
        });

        expect(res.json).toHaveBeenCalledWith([
            {
                transaction_id: 101,
                date: "2025-06-10",
                type: "income",
                amount: 100000,
                category: "Infaq",
                wallet: "Kas Masjid",
                description: "Donasi Jumat"
            },
            {
                transaction_id: 102,
                date: "2025-06-09",
                type: "expense",
                amount: 50000,
                category: "Operasional",
                wallet: "Kas Masjid",
                description: "Bayar Listrik"
            }
        ]);
    });

    it("should return empty array if no wallets found", async () => {
        db.wallet.findAll = jest.fn().mockResolvedValue([]); // tidak ada wallet
        db.wallet_transaction.findAll = jest.fn().mockResolvedValue([]); // hindari Sequelize error

        await getRecentTransactions(req, res);

        expect(res.json).toHaveBeenCalledWith([]); // sekarang ini akan lolos
    });

    it("should handle errors and return 500", async () => {
        db.wallet.findAll = jest.fn().mockRejectedValue(new Error("DB error"));

        await getRecentTransactions(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Gagal mengambil transaksi terbaru"
        });
    });
});

describe("getTopCategories", () => {
    let req: any, res: any;

    beforeAll(() => {
        db.Sequelize.fn = jest.fn((fn, col) => `${fn}(${col})`);
        db.Sequelize.col = jest.fn(col => col);
        db.Sequelize.literal = jest.fn(val => val);
    });

    beforeEach(() => {
        res = {
            status: jest.fn(),
            json: jest.fn()
        };
        res.status.mockReturnValue(res); // ⬅️ Ini yang penting

        req = {
            params: { mosqueId: "1" },
            query: {
                type: "income",
                limit: "5",
                startDate: "2025-06-01",
                endDate: "2025-06-10"
            }
        };
    });

    it("should return top categories", async () => {
        db.wallet.findAll.mockResolvedValue([{ wallet_id: 1 }, { wallet_id: 2 }]);

        db.wallet_transaction.findAll.mockResolvedValue([
            {
                category_id: 1,
                get: () => 200000,
                category: { category_name: "Infaq" }
            },
            {
                category_id: 2,
                get: () => 150000,
                category: { category_name: "Donasi" }
            }
        ]);

        await getTopCategories(req, res);

        expect(res.json).toHaveBeenCalledWith([
            {
                category_id: 1,
                category_name: "Infaq",
                total_amount: 200000
            },
            {
                category_id: 2,
                category_name: "Donasi",
                total_amount: 150000
            }
        ]);
    });

    it("should return 400 if type is invalid", async () => {
        req.query.type = "invalid";

        await getTopCategories(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Tipe kategori tidak valid (income / expense)."
        });
    });

    it("should handle errors and return 500", async () => {
        db.wallet.findAll.mockRejectedValue(new Error("DB error"));

        await getTopCategories(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Gagal mengambil kategori tertinggi"
        });
    });
});

describe("getLineStats", () => {
    let req: any, res: any;

    beforeEach(() => {
        req = {
            query: {
                mosque_id: "1",
                range: "7d"
            }
        };

        res = {
            status: jest.fn().mockReturnValue({ json: jest.fn() }),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return grouped transaction data for 7 days", async () => {
        const today = moment().startOf('day');
        const createdAtIncome = today.clone().subtract(2, 'days').toDate();
        const createdAtExpense = today.clone().subtract(1, 'days').toDate();

        const mockTransactions = [
            {
                amount: "100000",
                transaction_type: "income",
                created_at: createdAtIncome,
            },
            {
                amount: "50000",
                transaction_type: "expense",
                created_at: createdAtExpense,
            }
        ];

        db.wallet_transaction.findAll.mockResolvedValue(mockTransactions);

        await getLineStats(req, res);

        const startDate = moment().subtract(6, 'days').startOf('day');
        const now = moment();
        const expectedDates: string[] = [];
        const expectedIncome: number[] = [];
        const expectedExpense: number[] = [];

        const current = startDate.clone();
        while (current.isSameOrBefore(now, 'day')) {
            const key = current.format("YYYY-MM-DD");
            expectedDates.push(key);
            if (key === moment(createdAtIncome).format("YYYY-MM-DD")) {
                expectedIncome.push(100000);
            } else {
                expectedIncome.push(0);
            }
            if (key === moment(createdAtExpense).format("YYYY-MM-DD")) {
                expectedExpense.push(50000);
            } else {
                expectedExpense.push(0);
            }
            current.add(1, "day");
        }

        expect(res.json).toHaveBeenCalledWith({
            labels: expectedDates,
            datasets: {
                income: expectedIncome,
                expense: expectedExpense
            }
        });
    });

    it("should fallback to 7d range if not provided", async () => {
        req.query = { mosque_id: "1" }; // no range

        db.wallet_transaction.findAll.mockResolvedValue([]);

        await getLineStats(req, res);

        const startDate = moment().subtract(6, 'days').startOf('day');
        const now = moment();
        const expectedDates: string[] = [];
        const expectedIncome: number[] = [];
        const expectedExpense: number[] = [];

        const current = startDate.clone();
        while (current.isSameOrBefore(now, 'day')) {
            expectedDates.push(current.format("YYYY-MM-DD"));
            expectedIncome.push(0);
            expectedExpense.push(0);
            current.add(1, "day");
        }

        expect(res.json).toHaveBeenCalledWith({
            labels: expectedDates,
            datasets: {
                income: expectedIncome,
                expense: expectedExpense
            }
        });
    });

    it("should handle internal server error", async () => {
        db.wallet_transaction.findAll.mockRejectedValue(new Error("DB error"));

        await getLineStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.status().json).toHaveBeenCalledWith({
            message: "Failed to get line chart data"
        });
    });
});

describe("getPeriodicReportExport", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 if required query params are missing", async () => {
        const req = {
            query: { period: "monthly", year: "2024", format: "pdf" }, // month is missing
            userId: 1,
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await getPeriodicReportExport(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Parameter tidak lengkap." });
    });

    it("should return 404 if user or mosque not found", async () => {
        const req = {
            query: { period: "monthly", year: "2024", month: "5", format: "pdf" },
            userId: 1,
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        db.user.findByPk.mockResolvedValue(null); // Simulasikan user tidak ditemukan

        await getPeriodicReportExport(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "User atau data masjid tidak ditemukan." });
    });

    it("should return 404 if no wallets found", async () => {
        const req = {
            query: { period: "monthly", year: "2024", month: "5", format: "pdf" },
            userId: 1,
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        db.user.findByPk.mockResolvedValue({
            mosque_id: 123,
            mosque: { name: "Masjid Test", address: "Jl. Test" },
            name: "Pak Bendahara"
        });
        db.wallet.findAll.mockResolvedValue([]); // Dompet kosong

        await getPeriodicReportExport(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Tidak ada dompet yang ditemukan untuk masjid ini." });
    });

    it("should generate PDF report", async () => {
        const req = {
            query: { period: "monthly", year: "2024", month: "5", format: "pdf" },
            userId: 1,
        };
        const res = {
            setHeader: jest.fn(),
            pipe: jest.fn(),
            end: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };


        db.user.findByPk.mockResolvedValue({
            mosque_id: 123,
            mosque: { name: "Masjid Test", address: "Jl. Test" },
            name: "Pak Bendahara"
        });

        db.wallet.findAll.mockResolvedValue([
            { wallet_id: 1, wallet_name: "Kas Masjid" },
            { wallet_id: 2, wallet_name: "Bank Masjid" }
        ]);

        db.wallet_transaction.findAll
            .mockResolvedValueOnce([
                { amount: 1000000, transaction_type: "income" },
                { amount: 500000, transaction_type: "expense" }
            ]) // transaksiBefore
            .mockResolvedValueOnce([
                {
                    amount: 500000,
                    transaction_type: "income",
                    transaction_date: new Date(),
                    wallet: { wallet_name: "Kas Masjid" },
                    category: { category_name: "Infaq" },
                    source_or_usage: "Infaq Jumat"
                },
                {
                    amount: 300000,
                    transaction_type: "expense",
                    transaction_date: new Date(),
                    wallet: { wallet_name: "Kas Masjid" },
                    category: { category_name: "Listrik" },
                    source_or_usage: "Bayar listrik"
                }
            ]); // transaksi in period

        financeUtils.getCurrentWalletBalance.mockResolvedValue(600000); // untuk semua dompet

        await getPeriodicReportExport(req, res);

        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
        expect(res.setHeader).toHaveBeenCalledWith(
            "Content-Disposition",
            expect.stringContaining("laporan-keuangan.pdf")
        );
        expect(mockPipe).toHaveBeenCalled();
        expect(mockEnd).toHaveBeenCalled();

    });
});