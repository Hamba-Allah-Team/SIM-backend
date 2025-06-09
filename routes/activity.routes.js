const { verifyToken } = require("../middleware/auth.middleware");
const activityController = require("../controllers/activity.controller");
const uploadMiddleware = require("../middleware/upload.middleware.js"); // 👈 1. Impor middleware upload Anda

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // 📌 Admin Activity routes (dengan autentikasi)
    app.post(
        "/api/activities",
        [verifyToken, uploadMiddleware.single("activityImage")], // 👈 2. Tambahkan multer di sini
        activityController.createActivity
    );
    app.get("/api/activities", verifyToken, activityController.getActivities);
    app.get("/api/activities/:id", verifyToken, activityController.getActivityById);
    app.put(
        "/api/activities/:id",
        [verifyToken, uploadMiddleware.single("activityImage")], // 👈 3. Tambahkan multer di sini
        activityController.updateActivity
    );
    app.delete("/api/activities/:id", verifyToken, activityController.deleteActivity);

    // 📌 Guest Activity routes (tanpa autentikasi)
    app.get("/api/activities/guest/:mosque_id", activityController.getPublicActivities);
    app.get("/api/activities/guest/:mosque_id/:id", activityController.getPublicActivityById);
    app.get("/api/public/activities/upcoming/:slug", activityController.getUpcomingActivities);
    app.get("/api/public/activities/all/:slug", activityController.getAllUpcomingActivities);
};