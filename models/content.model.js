module.exports = (sequelize, Sequelize) => {
    const Content = sequelize.define("contents", {
        contents_id: {
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
            }
        },
        title: {
            type: Sequelize.STRING,
            allowNull: false
        },
        content_description: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        image: {
            type: Sequelize.STRING,
            allowNull: true
        },
        published_date: {
            type: Sequelize.DATEONLY,
            allowNull: false
        },
        contents_type: {
            type: Sequelize.ENUM('artikel', 'berita'),
            allowNull: false
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',  // Nama tabel Users
                key: 'user_id'   // Kolom yang menjadi foreign key
            }
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
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    // Relasi dengan tabel Mosques
    Content.associate = (models) => {
        Content.belongsTo(models.mosques, {
            foreignKey: 'mosque_id',
            as: 'mosque'
        });

        // Relasi dengan tabel Users
        Content.belongsTo(models.user, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return Content;
};
