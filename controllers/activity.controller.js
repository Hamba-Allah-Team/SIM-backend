const db = require("../models");
const Activity = db.activity;
const Mosque = db.mosque;
const User = db.user;

// 📥 CREATE activity
exports.createActivity = async (req, res) => {
    try {
        const {
            mosque_id, event_name, image, event_description,
            start_date, end_date, start_time, end_time, user_id
        } = req.body;

        const newActivity = await Activity.create({
            mosque_id,
            event_name,
            image,
            event_description,
            start_date,
            end_date,
            start_time,
            end_time,
            user_id
        });

        res.status(201).json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        res.status(500).json({ message: "Failed to create activity" });
    }
};

// 📤 GET all activities
exports.getAllActivities = async (req, res) => {
    try {
        const activities = await Activity.findAll({
            include: [
                { model: Mosque, as: "mosque", attributes: ["mosque_id", "mosque_name"] },
                { model: User, as: "user", attributes: ["user_id", "full_name"] }
            ],
            order: [["start_date", "ASC"], ["start_time", "ASC"]]
        });

        res.json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({ message: "Failed to fetch activities" });
    }
};

// 📄 GET activity by ID
exports.getActivityById = async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id, {
            include: [
                { model: Mosque, as: "mosque", attributes: ["mosque_id", "mosque_name"] },
                { model: User, as: "user", attributes: ["user_id", "full_name"] }
            ]
        });

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        res.json(activity);
    } catch (error) {
        console.error("Error fetching activity:", error);
        res.status(500).json({ message: "Failed to fetch activity" });
    }
};

// ✏️ UPDATE activity
exports.updateActivity = async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        await activity.update(req.body);

        res.json({ message: "Activity updated successfully", data: activity });
    } catch (error) {
        console.error("Error updating activity:", error);
        res.status(500).json({ message: "Failed to update activity" });
    }
};

// 🗑️ DELETE activity
exports.deleteActivity = async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        await activity.destroy();

        res.json({ message: "Activity deleted successfully" });
    } catch (error) {
        console.error("Error deleting activity:", error);
        res.status(500).json({ message: "Failed to delete activity" });
    }
};

exports.getPublicActivities = async (req, res) => {
    try {
        const mosqueId = req.params.mosque_id;

        const activities = await Activity.findAll({
            where: { mosque_id: mosqueId },
            attributes: {
                exclude: ['created_at', 'updated_at'] // atau sesuaikan jika ingin tampilkan semua
            },
            order: [['start_date', 'ASC']]
        });

        res.json(activities);
    } catch (error) {
        console.error("Error fetching public activities:", error);
        res.status(500).json({ message: "Failed to retrieve public activities" });
    }
};

exports.getPublicActivityById = async (req, res) => {
    try {
        const { mosque_id, id } = req.params;

        const activity = await Activity.findOne({
            where: {
                mosque_id,
                activities_id: id
            },
            attributes: {
                exclude: ['created_at', 'updated_at']
            }
        });

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        res.json(activity);
    } catch (error) {
        console.error("Error fetching public activity by ID:", error);
        res.status(500).json({ message: "Failed to retrieve activity detail" });
    }
};
