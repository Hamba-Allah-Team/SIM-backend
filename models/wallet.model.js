module.exports = (sequelize, Sequelize) => {
    const Wallet = sequelize.define("wallets", {
        wallet_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        mosque_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        wallet_type: {
            type: Sequelize.ENUM("cash", "bank"),
            allowNull: false
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

    Wallet.associate = (models) => {
        Wallet.hasMany(models.finances, {
            foreignKey: "wallet_id",
            as: "transactions"
        });
        Wallet.belongsTo(models.mosques, {
            foreignKey: "mosque_id",
            as: "mosque"
        });
    };

    return Wallet;
};
