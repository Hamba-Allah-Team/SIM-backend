module.exports = (sequelize, Sequelize) => {
    const Activity = sequelize.define("activities", {
        activities_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        mosque_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        event_name: {
            type: Sequelize.STRING
        },
        image: {
            type: Sequelize.STRING
        },
        event_description: {
            type: Sequelize.TEXT
        },
        start_date: {
            type: Sequelize.DATE
        },
        end_date: {
            type: Sequelize.DATE
        },
        start_time: {
            type: Sequelize.TIME,
            allowNull: false
        },
        end_time: {
            type: Sequelize.TIME
        },
        user_id: {
            type: Sequelize.INTEGER
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
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    });

    Activity.associate = (models) => {
        Activity.belongsTo(models.mosque, {
            foreignKey: "mosque_id",
            as: "mosque"
        });
        Activity.belongsTo(models.user, {
            foreignKey: "user_id",
            as: "user"
        });
    };

    return Activity;
};