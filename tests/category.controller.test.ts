import { Request, Response } from "express";
import { createCategory, deleteCategory, getAllCategories, getCategoriesByMosqueId, getCategoryById, updateCategory } from "../controllers/transaction_category.controller"; // sesuaikan path
import { transaction_category as TransactionCategory } from "../models";

// Mock model
jest.mock("../models", () => ({
    transaction_category: {
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
    },
}));

// Mock response helper
const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("TransactionCategory Controller - createCategory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should create a new transaction category", async () => {
        const req = {
            body: {
                mosque_id: 1,
                category_name: "Infaq",
                category_type: "income",
                description: "Donasi sukarela",
            },
        } as Request;

        const res = mockResponse();

        const createdCategory = {
            category_id: 1,
            ...req.body,
        };

        (TransactionCategory.create as jest.Mock).mockResolvedValue(createdCategory);

        await createCategory(req, res);

        expect(TransactionCategory.create).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(createdCategory);
    });

    it("should return 400 if required fields are missing", async () => {
        const req = {
            body: {
                category_name: "Zakat",
                description: "Wajib",
            },
        } as Request;

        const res = mockResponse();

        await createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "mosque_id, category_name, and category_type are required.",
        });
        expect(TransactionCategory.create).not.toHaveBeenCalled();
    });

    it("should return 500 if an error occurs", async () => {
        const req = {
            body: {
                mosque_id: 1,
                category_name: "Sedekah",
                category_type: "income",
            },
        } as Request;

        const res = mockResponse();

        (TransactionCategory.create as jest.Mock).mockRejectedValue(
            new Error("DB Error")
        );

        await createCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "DB Error" });
    });
});

describe("TransactionCategory Controller - getAllCategories", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return all transaction categories", async () => {
        const req = {} as Request;
        const res = mockResponse();

        const mockCategories = [
            { category_id: 1, category_name: "Zakat", category_type: "income" },
            { category_id: 2, category_name: "Operasional", category_type: "expense" },
        ];

        (TransactionCategory.findAll as jest.Mock).mockResolvedValue(mockCategories);

        await getAllCategories(req, res);

        expect(TransactionCategory.findAll).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockCategories);
    });

    it("should return 500 if an error occurs", async () => {
        const req = {} as Request;
        const res = mockResponse();

        (TransactionCategory.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

        await getAllCategories(req, res);

        expect(TransactionCategory.findAll).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
    });
});

describe("TransactionCategory Controller - getCategoryById", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return category if found", async () => {
        const req = { params: { id: "1" } } as unknown as Request;
        const res = mockResponse();

        const mockCategory = {
            category_id: 1,
            category_name: "Zakat",
            category_type: "income",
        };

        (TransactionCategory.findByPk as jest.Mock).mockResolvedValue(mockCategory);

        await getCategoryById(req, res);

        expect(TransactionCategory.findByPk).toHaveBeenCalledWith("1");
        expect(res.json).toHaveBeenCalledWith(mockCategory);
    });

    it("should return 404 if category not found", async () => {
        const req = { params: { id: "999" } } as unknown as Request;
        const res = mockResponse();

        (TransactionCategory.findByPk as jest.Mock).mockResolvedValue(null);

        await getCategoryById(req, res);

        expect(TransactionCategory.findByPk).toHaveBeenCalledWith("999");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Category not found" });
    });

    it("should return 500 if an error occurs", async () => {
        const req = { params: { id: "1" } } as unknown as Request;
        const res = mockResponse();

        (TransactionCategory.findByPk as jest.Mock).mockRejectedValue(new Error("DB error"));

        await getCategoryById(req, res);

        expect(TransactionCategory.findByPk).toHaveBeenCalledWith("1");
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
    });
});

describe("TransactionCategory Controller - getCategoriesByMosqueId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return categories for given mosque ID", async () => {
        const req = { params: { mosqueId: "101" } } as any;
        const res = mockResponse();

        const mockCategories = [
            { category_id: 1, category_name: "Zakat", mosque_id: 101 },
            { category_id: 2, category_name: "Infak", mosque_id: 101 },
        ];

        (TransactionCategory.findAll as jest.Mock).mockResolvedValue(mockCategories);

        await getCategoriesByMosqueId(req, res);

        expect(TransactionCategory.findAll).toHaveBeenCalledWith({
            where: { mosque_id: "101" },
        });

        expect(res.json).toHaveBeenCalledWith(mockCategories);
    });

    it("should return 500 if database error occurs", async () => {
        const req = { params: { mosqueId: "101" } } as any;
        const res = mockResponse();

        (TransactionCategory.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

        await getCategoriesByMosqueId(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
    });
});

describe("TransactionCategory Controller - updateCategory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should update category successfully", async () => {
        const req = {
            params: { id: "1" },
            body: {
                mosque_id: 101,
                category_name: "Zakat Edited",
                category_type: "income",
                description: "Updated description"
            },
        } as any;
        const res = mockResponse();

        const mockCategory = {
            category_id: 1,
            mosque_id: 100,
            category_name: "Zakat",
            category_type: "income",
            description: "Old description",
            save: jest.fn().mockResolvedValue(undefined),
        };

        (TransactionCategory.findByPk as jest.Mock).mockResolvedValue(mockCategory);

        await updateCategory(req, res);

        expect(mockCategory.mosque_id).toBe(101);
        expect(mockCategory.category_name).toBe("Zakat Edited");
        expect(mockCategory.description).toBe("Updated description");
        expect(mockCategory.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockCategory);
    });

    it("should return 404 if category not found", async () => {
        const req = {
            params: { id: "999" },
            body: {},
        } as any;
        const res = mockResponse();

        (TransactionCategory.findByPk as jest.Mock).mockResolvedValue(null);

        await updateCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Category not found" });
    });

    it("should return 500 if error occurs", async () => {
        const req = {
            params: { id: "1" },
            body: {},
        } as any;
        const res = mockResponse();

        (TransactionCategory.findByPk as jest.Mock).mockRejectedValue(new Error("DB error"));

        await updateCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
    });
});

describe("TransactionCategory Controller - deleteCategory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should delete category successfully (soft delete)", async () => {
        const req = { params: { id: "1" } } as any;
        const res = mockResponse();

        const mockCategory = {
            destroy: jest.fn().mockResolvedValue(undefined),
        };

        (TransactionCategory.findByPk as jest.Mock).mockResolvedValue(mockCategory);

        await deleteCategory(req, res);

        expect(mockCategory.destroy).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: "Category deleted successfully." });
    });

    it("should return 404 if category not found", async () => {
        const req = { params: { id: "999" } } as any;
        const res = mockResponse();

        (TransactionCategory.findByPk as jest.Mock).mockResolvedValue(null);

        await deleteCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Category not found" });
    });

    it("should return 500 if error occurs during deletion", async () => {
        const req = { params: { id: "1" } } as any;
        const res = mockResponse();

        (TransactionCategory.findByPk as jest.Mock).mockRejectedValue(new Error("DB error"));

        await deleteCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "DB error" });
    });
});
