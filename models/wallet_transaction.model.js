module.exports = (sequelize, Sequelize) => {
    const WalletTransaction = sequelize.define("wallet_transaction", {
        transaction_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        wallet_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'wallets',
                key: 'wallet_id'
            },
            onDelete: 'CASCADE'
        },
        amount: {
            type: Sequelize.DECIMAL,
            allowNull: false
        },
        transaction_type: {
            type: Sequelize.ENUM("income", "expense", "transfer_out", "transfer_in"),
            allowNull: false
        },
        category_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'transaction_categories',
                key: 'category_id'
            },
            onDelete: 'SET NULL'
        },
        source_or_usage: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        transaction_date: {
            type: Sequelize.DATE,
            allowNull: false
        },
        balance: {
            type: Sequelize.DECIMAL,
            allowNull: false
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'user_id'
            },
            onDelete: 'SET NULL'
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
        createdAt: "created_at",
        updatedAt: "updated_at",
        paranoid: true,
        deletedAt: "deleted_at",
        underscored: true
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
        WalletTransaction.belongsTo(models.transaction_category, {
            foreignKey: "category_id",
            as: "category"
        });
    };

    return WalletTransaction;
};