const db = require("../models");
const bcrypt = require("bcryptjs");

const User = db.user;
const Activation = db.activations;
const Mosque = db.mosques;

// Submit Activation Request (signup)
exports.submitActivationRequest = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { username, proof_number, proof_image, type, mosque_name, mosque_address, mosque_description, mosque_phone_whatsapp, mosque_email, mosque_facebook, mosque_instagram } = req.body;

    // Validasi input wajib
    if (!username || !proof_number || !proof_image || !type) {
      return res.status(400).send({ message: "All fields are required!" });
    }

    // Validasi jenis aktivasi
    if (type !== "activation") {
      return res.status(400).send({ message: "Invalid activation type!" });
    }

    // Cek apakah username sudah terdaftar
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).send({ message: "Username already exists!" });
    }

    // Menyimpan permintaan aktivasi ke tabel 'activations'
    const activation = await Activation.create({
      username_input: username,
      transaction_number: proof_number,
      proof_image,
      activation_type: type,
      status: "pending",
    }, { transaction: t });

    let mosqueId = null;

    // Jika pengguna adalah admin, buat masjid baru
    if (mosque_name) {
      const mosque = await Mosque.create({
        name: mosque_name,
        address: mosque_address,
        description: mosque_description || null,
        phone_whatsapp: mosque_phone_whatsapp || null,
        email: mosque_email || null,
        facebook: mosque_facebook || null,
        instagram: mosque_instagram || null,
      }, { transaction: t });

      mosqueId = mosque.mosque_id;
    }

    // Commit transaksi untuk aktivasi
    await t.commit();
    res.status(201).send({ message: "Activation request submitted.", activation, mosqueId });
  } catch (error) {
    await t.rollback();
    console.error("Error submitting activation request:", error);
    res.status(500).send({ message: "Failed to submit activation request", error: error.message });
  }
};

// Process Activation Request (approve/reject)
exports.processActivationRequest = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { action } = req.body;
    const { id } = req.params;

    const activation = await Activation.findByPk(id);
    if (!activation) {
      return res.status(404).send({ message: "Request not found." });
    }

    if (activation.status === "approved" || activation.status === "rejected") {
      return res.status(400).send({ message: "This request has already been processed." });
    }

    if (action === "approve") {
      // Jika aktivasi disetujui, buat user baru
      const { username_input, transaction_number, proof_image } = activation;
      const user = await User.create({
        username: username_input,
        email: `${username_input}@example.com`, // Sesuaikan email
        password: bcrypt.hashSync("defaultpassword", 8), // Password default
        name: username_input,
        role: "admin", // Sesuaikan jika perlu
        status: "active",
        mosque_id: activation.mosque_id || null, // Relasi masjid jika ada
      }, { transaction: t });

      // Update status aktivasi ke "approved"
      await activation.update({
        status: "approved",
        approved_at: new Date(),
        user_id: user.user_id,
      }, { transaction: t });

      // Commit transaksi
      await t.commit();
      return res.status(200).send({ message: "User activated and added.", user });
    } else if (action === "reject") {
      // Jika permintaan ditolak
      await activation.update({ status: "rejected", approved_at: new Date() }, { transaction: t });
      await t.commit();
      return res.status(200).send({ message: "Request rejected successfully." });
    }

    res.status(400).send({ message: "Invalid action." });
  } catch (error) {
    await t.rollback();
    console.error("Error processing activation request:", error);
    res.status(500).send({ message: error.message });
  }
};

// Submit Extension Request (perpanjangan)
exports.submitExtensionRequest = async (req, res) => { 
  try {
    const { username, proof_number, proof_image, type } = req.body;

    // Cek apakah semua field diperlukan ada
    if (!username || !proof_number || !proof_image || !type) {
      return res.status(400).send({ message: "All fields are required!" });
    }

    // Cek apakah jenis request adalah extension
    if (type !== "extension") {
      return res.status(400).send({ message: "Invalid extension type!" });
    }

    // Cek apakah user dengan username ada di tabel users
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Jika user ditemukan, buat extension request baru
    const extension = await Activation.create({
      username_input: username,
      transaction_number: proof_number,
      proof_image,
      activation_type: type,
      status: "pending",
    });

    res.status(201).send({ message: "Extension request submitted.", extension });
  } catch (error) {
    console.error("Error submitting extension request:", error);
    res.status(500).send({ message: "Failed to submit extension request", error: error.message });
  }
};


// Process Extension Request (approve/reject)
exports.processExtensionRequest = async (req, res) => {
  try {
    const { action } = req.body;
    const { id } = req.params;

    const extension = await Activation.findByPk(id);
    if (!extension) {
      return res.status(404).send({ message: "Request not found." });
    }

    if (extension.status === "approved" || extension.status === "rejected") {
      return res.status(400).send({ message: "This request has already been processed." });
    }

    if (action === "approve") {
      // Memproses perpanjangan jika disetujui
      const user = await User.findOne({ where: { username: extension.username_input } });

      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }

      user.extension_code = extension.transaction_number;
      user.profile_image = extension.proof_image;
      await user.save();

      await extension.update({
        status: "approved",
        approved_at: new Date(),
        user_id: user.user_id,
      });

      return res.status(200).send({ message: "Extension approved and updated.", user });
    } else if (action === "reject") {
      await extension.update({ status: "rejected", approved_at: new Date() });
      return res.status(200).send({ message: "Request rejected successfully." });
    }

    res.status(400).send({ message: "Invalid action." });
  } catch (error) {
    console.error("Error processing extension request:", error);
    res.status(500).send({ message: error.message });
  }
};
