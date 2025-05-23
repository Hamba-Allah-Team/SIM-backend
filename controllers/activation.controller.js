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
      type,
      mosque_name,
      mosque_address,
      mosque_description,
      mosque_phone_whatsapp,
      mosque_email,
      mosque_facebook,
      mosque_instagram,
    } = req.body;

    if (!username || !email || !proof_number || !type) {
      return res.status(400).send({ message: "All required fields must be filled!" });
    }

    if (!req.file) {
      return res.status(400).send({ message: "Proof image is required!" });
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

    const anyMosqueFieldFilled =
      mosque_name || mosque_address || mosque_description || mosque_phone_whatsapp || mosque_email || mosque_facebook || mosque_instagram;

    if (anyMosqueFieldFilled) {
      if (!mosque_name || !mosque_address) {
        return res.status(400).send({
          message: "Mosque name and address are required if mosque data is provided.",
        });
      }
    }

    const proof_image = req.file.filename;

    const activation = await Activation.create(
      {
        username,
        email,
        transaction_number: proof_number,
        proof_image,
        activation_type: type,
        status: "pending",
        mosque_name: mosque_name || null,
        mosque_address: mosque_address || null,
        mosque_phone_whatsapp: mosque_phone_whatsapp || null,
        mosque_email: mosque_email || null,
        mosque_facebook: mosque_facebook || null,
        mosque_instagram: mosque_instagram || null,
        mosque_description: mosque_description || null,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).send({
      message: "Activation request submitted successfully.",
      activation,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error submitting activation request:", error);
    res.status(500).send({
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
      return res.status(400).send({ message: "This request has already been processed." });
    }

    if (action === "approve") {
      const {
        username,
        email,
        transaction_number,
        proof_image,
        mosque_name,
        mosque_address,
        mosque_description,
        mosque_phone_whatsapp,
        mosque_email,
        mosque_facebook,
        mosque_instagram,
      } = activation;

      // Jika user mengisi data masjid, maka mosque_name dan mosque_address wajib
      const anyMosqueDataProvided =
        mosque_name || mosque_address || mosque_description ||
        mosque_phone_whatsapp || mosque_email || mosque_facebook || mosque_instagram;

      if (anyMosqueDataProvided && (!mosque_name || !mosque_address)) {
        return res.status(400).send({
          message: "Mosque name and address are required if mosque data was provided.",
        });
      }

      let mosque = null;

      // Jika ada data masjid, buat masjid
      if (anyMosqueDataProvided) {
        mosque = await Mosque.create(
          {
            name: mosque_name,
            address: mosque_address,
            description: mosque_description || null,
            phone_whatsapp: mosque_phone_whatsapp || null,
            email: mosque_email || null,
            facebook: mosque_facebook || null,
            instagram: mosque_instagram || null,
          },
          { transaction: t }
        );
      }

      const expiredDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expiredDate.setHours(0, 0, 0, 0);

      const user = await User.create(
        {
          username,
          email,
          password: bcrypt.hashSync("defaultpassword", 8),
          name: username,
          role: "admin",
          status: "active",
          mosque_id: mosque ? mosque.mosque_id : null,
          extension_code: transaction_number,
          profile_image: proof_image,
          expired_at: expiredDate,
        },
        { transaction: t }
      );

      await activation.update(
        {
          status: "approved",
          approved_at: new Date(),
          user_id: user.user_id,
          mosque_id: mosque ? mosque.mosque_id : null,
        },
        { transaction: t }
      );

      await t.commit();

      await sendMail({
        to: email,
        subject: "Permintaan Aktivasi Disetujui",
        html: `Halo ${username},<br><br>Permintaan aktivasi akun Anda telah disetujui. Akun Anda sekarang aktif.<br><br>Terima kasih sudah bergabung dengan kami!`,
      });

      return res.status(200).send({
        message: "User and mosque created activation approved.",
        user,
        mosque,
      });

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

      return res.status(200).send({ message: "Request rejected successfully." });
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
    const { username, email, proof_number, type } = req.body;

    if (!username || !email || !proof_number || !type) {
      return res.status(400).send({ message: "All fields are required!" });
    }

    if (!req.file) {
      return res.status(400).send({ message: "Proof image is required!" });
    }

    const proof_image = req.file.filename;

    if (type !== "extension") {
      return res.status(400).send({ message: "Invalid extension type!" });
    }

    const user = await User.findOne({ where: { username, email } });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const extension = await Activation.create({
      username,
      email,
      transaction_number: proof_number,
      proof_image,
      activation_type: type,
      status: "pending",
    });

    res.status(201).send({ message: "Extension request submitted.", extension });
  } catch (error) {
    console.error("Error submitting extension request:", error);
    res.status(500).send({
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

// Get all Activation Requests (for Admin)
exports.getActivationRequests = async (req, res) => {
  try {
    const {
      status,
      search = "",
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const where = {
      activation_type: "activation",
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { activation_id: !isNaN(search) ? Number(search) : -1 },
      ];
    }

    const activations = await Activation.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).send({
      total: activations.count,
      activations: activations.rows,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Error fetching activation requests:", error);
    res.status(500).send({ message: error.message });
  }
};

// Get Activation Request by ID
exports.getActivationRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const activation = await Activation.findOne({
      where: { activation_id: id, activation_type: "activation" },
    });

    if (!activation) {
      return res.status(404).send({ message: "Activation request not found." });
    }

    res.status(200).send({ activation });
  } catch (error) {
    console.error("Error fetching activation request:", error);
    res.status(500).send({ message: error.message });
  }
};

// Get all Extension Requests (for Admin)
exports.getExtensionRequests = async (req, res) => {
  try {
    const {
      status,
      search = "",
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const where = {
      activation_type: "extension",
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { activation_id: !isNaN(search) ? Number(search) : -1 },
      ];
    }

    const extensions = await Activation.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).send({
      total: extensions.count,
      extensions: extensions.rows,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Error fetching extension requests:", error);
    res.status(500).send({ message: error.message });
  }
};

// Get Extension Request by ID
exports.getExtensionRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const extension = await Activation.findOne({
      where: { activation_id: id, activation_type: "extension" },
    });

    if (!extension) {
      return res.status(404).send({ message: "Extension request not found." });
    }

    res.status(200).send({ extension });
  } catch (error) {
    console.error("Error fetching extension request:", error);
    res.status(500).send({ message: error.message });
  }
};