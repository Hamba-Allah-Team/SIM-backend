const config = require('../config/db.config.js');
const Sequelize = require('sequelize');

const sequelize = new Sequelize(
  config.DB,
  config.USER,
  config.PASSWORD,
  {
    host: config.HOST,
    port: config.PORT,
    dialect: config.dialect,
    pool: {
      max: config.pool.max,
      min: config.pool.min,
      acquire: config.pool.acquire,
      idle: config.pool.idle
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.mosques = require("./mosque.model.js")(sequelize, Sequelize);
db.user = require("./user.model.js")(sequelize, Sequelize);
db.wallet = require("./wallet.model.js")(sequelize, Sequelize);
db.wallet_transaction = require("./wallet_transaction.model.js")(sequelize, Sequelize);
db.contents = require("./content.model.js")(sequelize, Sequelize);
db.activity = require("./activity.model.js")(sequelize, Sequelize);
db.activations = require("./activation.model.js")(sequelize, Sequelize);
db.reservation_room = require("./reservation_room.model.js")(sequelize, Sequelize);
db.reservation = require("./reservation.model.js")(sequelize, Sequelize);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;