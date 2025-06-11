module.exports = (sequelize, Sequelize) => {
    const ReservationRoom = sequelize.define("reservations_room", {
        room_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
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
        place_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        image: {
            type: Sequelize.STRING,
            allowNull: true
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        capacity: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        facilities: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        created_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        updated_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        deleted_at: {
            type: Sequelize.DATE,
            allowNull: true
        }
    }, {
        tableName: 'reservations_room',
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at",
        paranoid: true,
        underscored: true,
    });

    ReservationRoom.associate = (models) => {
        ReservationRoom.belongsTo(models.mosques, {
            foreignKey: 'mosque_id',
            as: 'mosque'
        });
        ReservationRoom.hasMany(models.reservation, {
            foreignKey: 'room_id',
            as: 'reservations',
        });
    };

    return ReservationRoom;
};
