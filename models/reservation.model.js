const { allow } = require("joi");

module.exports = (sequelize, Sequelize) => {
    const Reservation = sequelize.define("reservations", {
        reservation_id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        mosque_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'mosques',
                key: 'mosque_id'
            },
            onDelete: 'CASCADE'
        },
        room_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'reservations_room',
                key: 'room_id'
            },
            onDelete: 'CASCADE'
        },
        title: {
            type: Sequelize.STRING,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        phone_number: {
            type: Sequelize.STRING,
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        reservation_date: {
            type: Sequelize.DATEONLY,
            allowNull: false
        },
        start_time: {
            type: Sequelize.TIME,
            allowNull: false
        },
        end_time: {
            type: Sequelize.TIME,
            allowNull: false
        },
        status: {
            type: Sequelize.ENUM('pending', 'approved', 'rejected', 'completed'),
            defaultValue: 'pending',
            allowNull: false
        },
        admin_id: {
            type: Sequelize.INTEGER,
            references: {
                model: 'users',
                key: 'user_id'
            },
            allowNull: true
        },
        created_at:{
          type : Sequelize.DATE,
          defaultValue : Sequelize.literal('NOW()')
      },
      updated_at:{
          type : Sequelize.DATE,
          defaultValue : Sequelize.literal('NOW()')
      }
    }, {
      tableName : "reservations",
      timestamps : true,
      createdAt : "created_at",
      updatedAt : "updated_at",
      underscored : true
    });
  
    Reservation.associate = (models) => {
      Reservation.belongsTo(models.mosques, { foreignKey : "mosque_id", as : "mosque" });
      Reservation.belongsTo(models.reservation_room, { foreignKey : "room_id", as : "room" });
      Reservation.belongsTo(models.user, { foreignKey : "admin_id", as : "admin" });
    };
  
    return Reservation;
}