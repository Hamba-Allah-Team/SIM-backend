module.exports = (sequelize, Sequelize) => {
    const WalletTransaction = sequelize.define("wallet_transactions", {
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
            type: Sequelize.ENUM("income", "expense"),
            allowNull: false
        },
        source_or_usage: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        transaction_date: {
            type: Sequelize.DATE, // Sequelize.DATE supports timezone by default
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
        paranoid: true, // aktifkan soft delete
        deletedAt: "deleted_at", // tentukan nama kolom soft delete
        underscored: true // optional: agar otomatis pakai snake_case untuk semua kolom
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