const { verifyToken } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware"); // Import multer middleware
const contentController = require("../controllers/content.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Route admin dengan upload middleware
  app.post(
    "/api/content",
    verifyToken,
    upload.single("image"), // field name harus "image"
    contentController.createContent
  );

  app.put(
    "/api/content/:id",
    verifyToken,
    upload.single("image"), // field name harus "image"
    contentController.updateContent
  );

  app.get("/api/content", verifyToken, contentController.getContents);
  app.get("/api/content/:id", verifyToken, contentController.getContentById);
  app.delete("/api/content/:id", verifyToken, contentController.deleteContent);

  // Guest routes
  app.get("/api/guest/content/:mosque_id", contentController.getPublicContents);
  app.get(
    "/api/guest/content/:mosque_id/:id",
    contentController.getPublicContentById
  );
  app.get("/api/public/news/recent/:slug", contentController.getPublicRecentNews);
};
