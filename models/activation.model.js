module.exports = (sequelize, DataTypes) => {
  const Activation = sequelize.define("activation", {
    activation_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mosque_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    activation_type: {
      type: DataTypes.ENUM('activation', 'extension'),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proof_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    proof_image: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mosque_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mosque_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mosque_phone_whatsapp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mosque_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mosque_facebook: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mosque_instagram: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    submitted_at: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('NOW()'),
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  }, {
    underscored: true,
    timestamps: true,
    tableName: 'activations',
  });

  return Activation;
};
