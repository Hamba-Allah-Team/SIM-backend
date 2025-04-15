const { verifyToken } = require("../middleware/auth.middleware");
const controller = require("../controllers/auth.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/auth/signup", controller.signup);
  app.post("/api/auth/signin", controller.signin);
  app.get("/api/auth/profile", verifyToken, controller.profile);
  app.post("/api/auth/logout", verifyToken, controller.logout);
};