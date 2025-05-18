const db = require("../models");
const bcrypt = require("bcryptjs");

const User = db.user;
const Activation = db.activations;
const Mosque = db.mosques;
const { Op } = require("sequelize");
const { sendMail } = require("../utils/sendMail");

// Submit Activation Request (signup)
exports.submitActivationRequest = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const {
      username,
      email,
      proof_number,
      proof_image,
      type,
      mosque_name,
      mosque_address,
      mosque_description,
      mosque_phone_whatsapp,
      mosque_facebook,
      mosque_instagram,
    } = req.body;

    if (!username || !email || !proof_number || !proof_image || !type) {
      return res.status(400).send({ message: "All fields are required!" });
    }

    if (type !== "activation") {
      return res.status(400).send({ message: "Invalid activation type!" });
    }

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ username }, { email }] },
    });
    if (existingUser) {
      return res
        .status(400)
        .send({ message: "Username or email already exists!" });
    }

    const activation = await Activation.create(
      {
        username: username,
        email: email,
        transaction_number: proof_number,
        proof_image,
        activation_type: type,
        status: "pending",
      },
      { transaction: t }
    );

    let mosqueId = null;

    if (mosque_name) {
      const mosque = await Mosque.create(
        {
          name: mosque_name,
          address: mosque_address,
          description: mosque_description || null,
          phone_whatsapp: mosque_phone_whatsapp || null,
          facebook: mosque_facebook || null,
          instagram: mosque_instagram || null,
        },
        { transaction: t }
      );

      mosqueId = mosque.mosque_id;
      activation.mosque_id = mosqueId;
      await activation.save({ transaction: t });
    }

    await t.commit();
    res
      .status(201)
      .send({ message: "Activation request submitted.", activation, mosqueId });
  } catch (error) {
    await t.rollback();
    console.error("Error submitting activation request:", error);
    res
      .status(500)
      .send({
        message: "Failed to submit activation request",
        error: error.message,
      });
  }
};

// Process Activation Request
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
      return res
        .status(400)
        .send({ message: "This request has already been processed." });
    }

    if (action === "approve") {
      const { username, email, transaction_number, proof_image, mosque_id } =
        activation;
      const user = await User.create(
        {
          username: username,
          email: email,
          password: bcrypt.hashSync("defaultpassword", 8),
          name: username,
          role: "admin",
          status: "active",
          mosque_id: mosque_id || null,
          extension_code: transaction_number,
          profile_image: proof_image,
          expired_at: (() => {
            const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            date.setHours(0, 0, 0, 0);
            return date;
          })(),
        },
        { transaction: t }
      );

      await activation.update(
        {
          status: "approved",
          approved_at: new Date(),
          user_id: user.user_id,
        },
        { transaction: t }
      );

      await t.commit();

      await sendMail({
        to: email,
        subject: "Permintaan Aktivasi Disetujui",
        html: `Halo ${username},<br><br>Permintaan aktivasi akun Anda telah disetujui. Akun Anda sekarang aktif.<br><br>Terima kasih sudah bergabung dengan kami!`,
      });

      return res
        .status(200)
        .send({ message: "User activated and added.", user });
    } else if (action === "reject") {
      await activation.update(
        { status: "rejected", approved_at: new Date() },
        { transaction: t }
      );
      await t.commit();

      await sendMail({
        to: activation.email,
        subject: "Permintaan Aktivasi Ditolak",
        html: `Halo ${activation.username},<br><br>Mohon maaf, permintaan aktivasi akun Anda ditolak. Silakan hubungi layanan dukungan untuk informasi lebih lanjut.<br><br>Terima kasih.`,
      });

      return res
        .status(200)
        .send({ message: "Request rejected successfully." });
    }

    res.status(400).send({ message: "Invalid action." });
  } catch (error) {
    await t.rollback();
    console.error("Error processing activation request:", error);
    res.status(500).send({ message: error.message });
  }
};

// Submit Extension Request
exports.submitExtensionRequest = async (req, res) => {
  try {
    const { username, email, proof_number, proof_image, type } = req.body;

    if (!username || !email || !proof_number || !proof_image || !type) {
      return res.status(400).send({ message: "All fields are required!" });
    }

    if (type !== "extension") {
      return res.status(400).send({ message: "Invalid extension type!" });
    }

    const user = await User.findOne({ where: { username, email } });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const extension = await Activation.create({
      username: username,
      email: email,
      transaction_number: proof_number,
      proof_image,
      activation_type: type,
      status: "pending",
    });

    res
      .status(201)
      .send({ message: "Extension request submitted.", extension });
  } catch (error) {
    console.error("Error submitting extension request:", error);
    res
      .status(500)
      .send({
        message: "Failed to submit extension request",
        error: error.message,
      });
  }
};

// Process Extension Request
exports.processExtensionRequest = async (req, res) => {
  try {
    if (!req.body || !req.body.action) {
      return res
        .status(400)
        .send({ message: "Missing action in request body." });
    }

    const { action } = req.body;
    const { id } = req.params;

    const extension = await Activation.findByPk(id);
    if (!extension) {
      return res.status(404).send({ message: "Request not found." });
    }

    if (extension.status === "approved" || extension.status === "rejected") {
      return res
        .status(400)
        .send({ message: "This request has already been processed." });
    }

    if (action === "approve") {
      const user = await User.findOne({
        where: {
          username: extension.username,
          email: extension.email,
        },
      });

      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }

      user.extension_code = extension.transaction_number;
      user.profile_image = extension.proof_image;

      const now = new Date();
      const currentExpired = user.expired_at || now;
      const extendedDate = new Date(
        currentExpired.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      extendedDate.setHours(0, 0, 0, 0);
      user.expired_at = extendedDate;

      await user.save();

      await extension.update({
        status: "approved",
        approved_at: new Date(),
        user_id: user.user_id,
      });

      await sendMail({
        to: user.email,
        subject: "Permintaan Perpanjangan Disetujui",
        html: `Halo ${
          user.username
        },<br><br>Permintaan perpanjangan akun Anda telah disetujui. Masa aktif akun Anda diperpanjang hingga tanggal ${extendedDate.toLocaleDateString(
          "id-ID"
        )}.<br><br>Terima kasih telah menggunakan layanan kami!`,
      });

      return res
        .status(200)
        .send({ message: "Extension approved and updated.", user });
    } else if (action === "reject") {
      await extension.update({
        status: "rejected",
        approved_at: new Date(),
      });

      await sendMail({
        to: extension.email,
        subject: "Permintaan Perpanjangan Ditolak",
        html: `Halo ${extension.username},<br><br>Mohon maaf, permintaan perpanjangan akun Anda ditolak. Silakan hubungi layanan dukungan untuk informasi lebih lanjut.<br><br>Terima kasih.`,
      });

      return res
        .status(200)
        .send({ message: "Request rejected successfully." });
    }

    return res.status(400).send({ message: "Invalid action." });
  } catch (error) {
    console.error("Error processing extension request:", error);
    res.status(500).send({ message: error.message });
  }
};
