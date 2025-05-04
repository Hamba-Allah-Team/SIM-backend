const { verifyToken } = require("../middleware/auth.middleware");
const contentController = require("../controllers/content.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Content routes admin
  app.post("/api/content", verifyToken, contentController.createContent); // Menambah konten, memerlukan verifikasi token
  app.get("/api/content", verifyToken, contentController.getContents); // Menampilkan daftar konten (dengan sorting dan search)
  app.get("/api/content/:id", verifyToken, contentController.getContentById); // Menampilkan detail konten berdasarkan ID
  app.put("/api/content/:id", verifyToken, contentController.updateContent); // Mengedit konten, memerlukan verifikasi token
  app.delete("/api/content/:id", verifyToken, contentController.deleteContent); // Menghapus konten, memerlukan verifikasi token

  //content routes guest
  app.get("/api/content/guest/:mosque_id", contentController.getPublicContents); // Ambil semua konten publik berdasarkan mosque_id
  app.get("/api/content/guest/:mosque_id/:id", contentController.getPublicContentById); // Ambil 1 konten publik berdasarkan mosque_id dan id

};
