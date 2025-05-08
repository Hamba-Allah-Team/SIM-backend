const { verifyToken } = require("../middleware/auth.middleware");
const activityController = require("../controllers/activityController");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // 📌 Admin Activity routes (dengan autentikasi)
    app.post("/api/activities", verifyToken, activityController.createActivity); // Tambah kegiatan
    app.get("/api/activities", verifyToken, activityController.getAllActivities); // Semua kegiatan
    app.get("/api/activities/:id", verifyToken, activityController.getActivityById); // Detail kegiatan
    app.put("/api/activities/:id", verifyToken, activityController.updateActivity); // Update kegiatan
    app.delete("/api/activities/:id", verifyToken, activityController.deleteActivity); // Hapus kegiatan

    // 📌 Guest Activity routes (tanpa autentikasi)
    app.get("/api/activities/guest/:mosque_id", activityController.getPublicActivities); // Semua kegiatan publik berdasarkan mosque_id
    app.get("/api/activities/guest/:mosque_id/:id", activityController.getPublicActivityById); // Detail kegiatan publik berdasarkan mosque_id dan id
};
