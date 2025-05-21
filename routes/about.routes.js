const { verifyToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware"); // multer middleware
const aboutController = require("../controllers/about.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Routes untuk admin dengan upload middleware (untuk update termasuk upload gambar)
  app.put(
    "/api/about",
    verifyToken,
    upload.single("image"), // pastikan field upload bernama 'image'
    aboutController.updateAbout
  );

  // Routes untuk guest (tanpa autentikasi)
  app.get("/api/about/guest/:mosque_id", aboutController.getAboutByMosqueId);

  // Routes untuk user terautentikasi (tanpa upload)
  app.get("/api/about", verifyToken, aboutController.getAbout);
};
