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

  // Content routes
  app.post("/api/content", verifyToken, contentController.createContent); // Menambah konten, memerlukan verifikasi token
  app.get("/api/content", contentController.getContents); // Menampilkan daftar konten (dengan sorting dan search), bisa diakses oleh siapa saja
  app.get("/api/content/:id", contentController.getContentById); // Menampilkan detail konten berdasarkan ID, bisa diakses oleh siapa saja
  app.put("/api/content/:id", verifyToken, contentController.updateContent); // Mengedit konten, memerlukan verifikasi token
  app.delete("/api/content/:id", verifyToken, contentController.deleteContent); // Menghapus konten, memerlukan verifikasi token
};
