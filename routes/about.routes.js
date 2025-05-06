const { verifyToken } = require("../middleware/auth.middleware");
const aboutController = require("../controllers/about.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Routes untuk admin
  app.put("/api/about", verifyToken, aboutController.updateAbout); // Update informasi masjid oleh admin

  // Routes untuk guest
  app.get("/api/about/guest/:mosque_id", aboutController.getAboutByMosqueId); // Get informasi masjid berdasarkan mosque_id untuk guest
  
  // Routes untuk user terautentikasi
  app.get("/api/about", verifyToken, aboutController.getAbout); // Get informasi masjid untuk user yang terautentikasi
};
