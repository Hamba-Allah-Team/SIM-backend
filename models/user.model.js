module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define("users", {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      mosque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mosques",
          key: "mosque_id"
        }
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM("superadmin", "admin"),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false
      },
      reset_password: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reset_password_expiration: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    }, {
      timestamps: false,
      underscored: true
    });
  
    User.associate = (models) => {
      User.belongsTo(models.mosques, {
        foreignKey: "mosque_id",
        as: "mosque"
      });
    };
  
    return User;
  };
  