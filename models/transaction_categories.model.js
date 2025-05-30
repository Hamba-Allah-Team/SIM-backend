module.exports = (sequelize, Sequelize) => {
    const TransactionCategory = sequelize.define("transaction_categories", {
        category_id: {
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
        category_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        category_type: {
            type: Sequelize.ENUM("income", "expense"),
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true
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

    TransactionCategory.associate = (models) => {
        TransactionCategory.belongsTo(models.mosques, {
            foreignKey: "mosque_id",
            as: "mosque"
        });
        TransactionCategory.hasMany(models.wallet_transaction, {
            foreignKey: "category_id",
            as: "wallet_transactions"
        });
    };

    return TransactionCategory;
};
