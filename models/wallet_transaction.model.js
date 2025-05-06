module.exports = (sequelize, Sequelize) => {
    const WalletTransaction = sequelize.define("wallet_transactions", {
        transaction_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        wallet_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        amount: {
            type: Sequelize.DECIMAL,
            allowNull: false
        },
        transaction_type: {
            type: Sequelize.ENUM("income", "expense"),
            allowNull: false
        },
        source_or_usage: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        transaction_date: {
            type: Sequelize.DATEONLY,
            allowNull: false
        },
        balance: {
            type: Sequelize.DECIMAL,
            allowNull: true
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: true
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

    WalletTransaction.associate = (models) => {
        WalletTransaction.belongsTo(models.wallet, {
            foreignKey: "wallet_id",
            as: "wallet"
        });
        WalletTransaction.belongsTo(models.user, {
            foreignKey: "user_id",
            as: "user"
        });
    };

    return WalletTransaction;
};
