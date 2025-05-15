const { verifyToken } = require("../middleware/auth.middleware");
const activationController = require("../controllers/activation.controller");

module.exports = function (app) {
  app.post("/api/activations/submit", activationController.submitActivationRequest);

  app.post("/api/activations/process/:id", verifyToken, activationController.processActivationRequest);

  app.post("/api/extensions/submit", activationController.submitExtensionRequest);

  app.post("/api/extensions/process/:id", verifyToken, activationController.processExtensionRequest);
};
