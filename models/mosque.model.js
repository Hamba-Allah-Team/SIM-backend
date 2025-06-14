module.exports = (sequelize, Sequelize) => {
  const Mosque = sequelize.define("mosques", {
    mosque_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    slug: {
      type: Sequelize.STRING,
      allowNull: true, // Sesuaikan dengan migrasi
      unique: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    address: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    image: {
      type: Sequelize.STRING,
      allowNull: true
    },
    phone_whatsapp: {
      type: Sequelize.STRING,
      allowNull: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true
    },
    facebook: {
      type: Sequelize.STRING,
      allowNull: true
    },
    instagram: {
      type: Sequelize.STRING,
      allowNull: true
    },
    latitude: {
      type: Sequelize.STRING,
      allowNull: true
    },
    longitude: {
      type: Sequelize.STRING,
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
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  const generateSlug = (instance) => {
    if (instance.name && instance.changed('name')) {
      const baseSlug = instance.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Ganti karakter non-alfanumerik dengan strip
        .replace(/^-+|-+$/g, '');   // Hapus strip di awal/akhir
      instance.slug = baseSlug;
    }
  };

  Mosque.beforeCreate(generateSlug);
  Mosque.beforeUpdate(generateSlug);

  Mosque.associate = (models) => {
    Mosque.hasMany(models.user, {
      foreignKey: "mosque_id",
      as: "users"
    });
  };

  return Mosque;
};
