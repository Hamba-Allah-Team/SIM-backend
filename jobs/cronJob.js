const cron = require("node-cron");
const { User } = require("../models/user.model");
const { Op } = require("sequelize");

cron.schedule("0 0 * * *", async () => {
  try {
    const expiredUsers = await User.findAll({
      where: {
        expired_at: {
          [Op.lt]: new Date(),
        },
        status: "active",
      },
    });

    for (let user of expiredUsers) {
      user.status = "inactive";
      await user.save();
      console.log(
        `User ${user.username} status changed to inactive due to expiration.`
      );
    }
  } catch (error) {
    console.error("Error updating expired users:", error.message);
  }
});
