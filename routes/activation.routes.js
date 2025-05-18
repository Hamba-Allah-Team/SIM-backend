const { verifyToken } = require("../middleware/auth.middleware");
const activationController = require("../controllers/activation.controller");

module.exports = function (app) {
  // Activation submit & process
  app.post("/api/activations/submit", activationController.submitActivationRequest);
  app.post("/api/activations/process/:id", verifyToken, activationController.processActivationRequest);

  // Extension submit & process
  app.post("/api/extensions/submit", activationController.submitExtensionRequest);
  app.post("/api/extensions/process/:id", verifyToken, activationController.processExtensionRequest);

  // Activation requests (admin read)
  app.get("/api/activations", verifyToken, activationController.getActivationRequests);
  app.get("/api/activations/:id", verifyToken, activationController.getActivationRequestById);

  // Extension requests (admin read)
  app.get("/api/extensions", verifyToken, activationController.getExtensionRequests);
  app.get("/api/extensions/:id", verifyToken, activationController.getExtensionRequestById);
};
