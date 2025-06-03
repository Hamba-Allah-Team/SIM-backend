module.exports = (sequelize, Sequelize) => {
    const Wallet = sequelize.define("wallets", {
        wallet_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        mosque_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'mosques', // pastikan sesuai nama model yang kamu pakai
                key: 'mosque_id'
            },
            onDelete: 'CASCADE'
        },
        wallet_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        wallet_type: {
            type: Sequelize.ENUM("cash", "bank", "ewallet", "other"),
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
        timestamps: true,
        paranoid: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        underscored: true
    });

    Wallet.associate = (models) => {
        Wallet.hasMany(models.wallet_transaction, {
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
