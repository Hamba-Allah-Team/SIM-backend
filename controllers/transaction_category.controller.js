const db = require("../models");
const TransactionCategory = db.transaction_category;

// 📥 CREATE Transaction Category
exports.createCategory = async (req, res) => {
    try {
        const { mosque_id, category_name, category_type, description } = req.body;

        if (!mosque_id || !category_name || !category_type) {
            return res.status(400).json({ message: "mosque_id, category_name, and category_type are required." });
        }

        const newCategory = await TransactionCategory.create({
            mosque_id,
            category_name,
            category_type,
            description
        });

        res.status(201).json(newCategory);
    } catch (error) {
        console.error("Error creating transaction category:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📤 GET ALL Transaction Categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await TransactionCategory.findAll();
        res.json(categories);
    } catch (error) {
        console.error("Error fetching transaction categories:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📤 GET Category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await TransactionCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: "Category not found" });

        res.json(category);
    } catch (error) {
        console.error("Error fetching category by ID:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📤 GET Categories by Mosque ID
exports.getCategoriesByMosqueId = async (req, res) => {
    try {
        const { mosqueId } = req.params;

        const categories = await TransactionCategory.findAll({
            where: { mosque_id: mosqueId }
        });

        res.json(categories);
    } catch (error) {
        console.error("Error fetching categories by mosque:", error);
        res.status(500).json({ error: error.message });
    }
};

// ✏️ UPDATE Category
exports.updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { mosque_id, category_name, category_type, description } = req.body;

        const category = await TransactionCategory.findByPk(categoryId);
        if (!category) return res.status(404).json({ message: "Category not found" });

        // Update fields
        category.mosque_id = mosque_id ?? category.mosque_id;
        category.category_name = category_name ?? category.category_name;
        category.category_type = category_type ?? category.category_type;
        category.description = description ?? category.description;

        await category.save();
        res.json(category);
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🗑️ DELETE (Soft Delete) Category
exports.deleteCategory = async (req, res) => {
    try {
        const category = await TransactionCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: "Category not found" });

        await category.destroy(); // soft delete via `paranoid: true`
        res.json({ message: "Category deleted successfully." });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: error.message });
    }
};
