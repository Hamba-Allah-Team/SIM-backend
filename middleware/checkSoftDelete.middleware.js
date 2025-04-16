const db = require("../models");
const User = db.user;

const checkSoftDelete = async (req, res, next) => {
  const user = await User.findByPk(req.userId);
  
if (!user) {
  console.error("User not found");
} else {
  console.log("User found:", user);
}
  try {
    
    const user = await User.findByPk(req.params.id);

    if (!user || user.deleted_at) {
      return res.status(404).send({ message: "User not found or already soft deleted." });
    }

    next();
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

module.exports = { checkSoftDelete };
