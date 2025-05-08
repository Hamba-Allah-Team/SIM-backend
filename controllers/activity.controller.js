const db = require("../models");
const Activity = db.activity;
const User = db.user;

// 📥 CREATE activity (gunakan user login)
exports.createActivity = async (req, res) => {
    try {
        const userId = req.userId;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const {
            event_name,
            image,
            event_description,
            start_date,
            end_date,
            start_time,
            end_time
        } = req.body;

        const newActivity = await Activity.create({
            mosque_id: user.mosque_id,
            user_id: userId,
            event_name,
            image,
            event_description,
            start_date,
            end_date,
            start_time,
            end_time
        });

        res.status(201).json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        res.status(500).json({ message: "Failed to create activity" });
    }
};

exports.getActivities = async (req, res) => {
    try {
        const user = await db.user.findByPk(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const activities = await Activity.findAll({
            where: { mosque_id: user.mosque_id },
            order: [['start_date', 'DESC']]
        });

        res.json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({ message: "Failed to retrieve activities" });
    }
};


// 📄 GET activity by ID
exports.getActivityById = async (req, res) => {
    try {
        const user = await db.user.findByPk(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const activity = await Activity.findOne({
            where: {
                activities_id: req.params.id,
                mosque_id: user.mosque_id
            }
        });

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        res.json(activity);
    } catch (error) {
        console.error("Error fetching activity:", error);
        res.status(500).json({ message: "Failed to retrieve activity" });
    }
};


// ✏️ UPDATE activity
exports.updateActivity = async (req, res) => {
    try {
        const user = await db.user.findByPk(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const activity = await Activity.findOne({
            where: {
                activities_id: req.params.id,
                mosque_id: user.mosque_id
            }
        });

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        await activity.update(req.body);
        res.json({ message: "Activity updated successfully", activity });
    } catch (error) {
        console.error("Error updating activity:", error);
        res.status(500).json({ message: "Failed to update activity" });
    }
};


// 🗑️ DELETE activity
exports.deleteActivity = async (req, res) => {
    try {
        const user = await db.user.findByPk(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const activity = await Activity.findOne({
            where: {
                activities_id: req.params.id,
                mosque_id: user.mosque_id
            }
        });

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
