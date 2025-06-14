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
      password,
      proof_number,
      type,
      mosque_name,
      mosque_address,
    } = req.body;

    // Ditambahkan: Validasi untuk password
    if (!username || !email || !password || !proof_number || !type) {
      await t.rollback();
      return res
        .status(400)
        .send({ message: "All required fields must be filled!" });
    }

    if (!req.file) {
      await t.rollback();
      return res.status(400).send({ message: "Proof image is required!" });
    }

    if (type !== "activation") {
      await t.rollback();
      return res.status(400).send({ message: "Invalid activation type!" });
    }

    const lowerCaseEmail = email.toLowerCase();

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ username: username }, { email: lowerCaseEmail }] },
      transaction: t,
    });

    if (existingUser) {
      await t.rollback();
      return res
        .status(400)
        .send({ message: "Username or email already exists!" });
    }

    const existingActivation = await Activation.findOne({
      where: {
        [Op.or]: [{ username }, { email: lowerCaseEmail }],
        status: { [Op.in]: ["pending", "approved"] },
      },
      transaction: t,
    });

    if (existingActivation) {
      await t.rollback();
      return res
        .status(400)
        .send({
          message:
            "An activation request with this username or email already exists or is being processed.",
        });
    }

    const anyMosqueFieldFilled =
      mosque_name ||
      mosque_address;

    if (anyMosqueFieldFilled) {
      if (!mosque_name || !mosque_address) {
        await t.rollback();
        return res.status(400).send({
          message:
            "Mosque name and address are required if mosque data is provided.",
        });
      }
    }

    const proof_image = req.file.filename;

    const hashedPassword = bcrypt.hashSync(password, 10);

    const activation = await Activation.create(
      {
        username,
        email: lowerCaseEmail,
        password: hashedPassword,
        proof_number: proof_number,
        proof_image,
        activation_type: type,
        status: "pending",
        mosque_name: mosque_name || null,
        mosque_address: mosque_address || null,
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

    const activation = await Activation.findByPk(id, { transaction: t });
    if (!activation) {
      await t.rollback();
      return res.status(404).send({ message: "Request not found." });
    }

    if (activation.status === "approved" || activation.status === "rejected") {
      await t.rollback();
      return res
        .status(400)
        .send({ message: "This request has already been processed." });
    }

    if (action === "approve") {
      const {
        username,
        email,
        password,
        proof_number,
        proof_image,
        mosque_name,
        mosque_address,
      } = activation;

      if (!password) {
        await t.rollback();
        return res
          .status(500)
          .send({ message: "Activation data is missing password." });
      }

      const anyMosqueDataProvided =
        mosque_name ||
        mosque_address;

      if (anyMosqueDataProvided && (!mosque_name || !mosque_address)) {
        await t.rollback();
        return res.status(400).send({
          message:
            "Mosque name and address are required if mosque data was provided.",
        });
      }

      let mosque = null;

      if (anyMosqueDataProvided) {
        mosque = await Mosque.create(
          {
            name: mosque_name,
            address: mosque_address,
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
          password: password,
          name: username,
          role: "admin",
          status: "active",
          mosque_id: mosque ? mosque.mosque_id : null,
          extension_code: proof_number,
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
        html: `Halo ${username},<br><br>Permintaan aktivasi akun Anda telah disetujui. Akun Anda sekarang aktif.<br><br>Password Anda adalah yang telah Anda daftarkan. Silakan login untuk melanjutkan.<br><br>Terima kasih sudah bergabung dengan kami!`,
      });

      return res.status(200).send({
        message: "User and mosque created, activation approved.",
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

      return res
        .status(200)
        .send({ message: "Request rejected successfully." });
    } else {
      await t.rollback();
      return res.status(400).send({ message: "Invalid action." });
    }
  } catch (error) {
    await t.rollback();
    console.error("Error processing activation request:", error);
    res.status(500).send({ message: error.message });
  }
};

exports.submitExtensionRequest = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { username, email, proof_number, type } = req.body;

    if (!username || !email || !proof_number || !type) {
      await t.rollback();
      return res.status(400).send({ message: "All fields are required!" });
    }

    if (!req.file) {
      await t.rollback();
      return res.status(400).send({ message: "Proof image is required!" });
    }

    const proof_image = req.file.filename;

    if (type !== "extension") {
      await t.rollback();
      return res.status(400).send({ message: "Invalid extension type!" });
    }

    const lowerCaseEmail = email.toLowerCase();

    const user = await User.findOne({
      where: {
        username: username,
        email: lowerCaseEmail,
      },
      transaction: t,
    });
    if (!user) {
      await t.rollback();
      return res.status(404).send({ message: "User not found." });
    }

    const extension = await Activation.create(
      {
        username,
        email: lowerCaseEmail,
        proof_number: proof_number,
        proof_image,
        activation_type: type,
        status: "pending",
        user_id: user.user_id,
      },
      { transaction: t }
    );

    await t.commit();
    res
      .status(201)
      .send({ message: "Extension request submitted.", extension });
  } catch (error) {
    await t.rollback();
    console.error("Error submitting extension request:", error);
    res.status(500).send({
      message: "Failed to submit extension request",
      error: error.message,
    });
  }
};

// Process Extension Request
exports.processExtensionRequest = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    if (!req.body || !req.body.action) {
      await t.rollback();
      return res
        .status(400)
        .send({ message: "Missing action in request body." });
    }

    const { action } = req.body;
    const { id } = req.params;

    const extensionRequest = await Activation.findByPk(id, { transaction: t });
    if (!extensionRequest) {
      await t.rollback();
      return res.status(404).send({ message: "Extension request not found." });
    }

    if (
      extensionRequest.status === "approved" ||
      extensionRequest.status === "rejected"
    ) {
      await t.rollback();
      return res
        .status(400)
        .send({
          message: "This extension request has already been processed.",
        });
    }

    const user = await User.findOne({
      where: {
        user_id: extensionRequest.user_id,
      },
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).send({ message: "Associated user not found." });
    }

    if (action === "approve") {
      user.extension_code = extensionRequest.proof_number;

      const now = new Date();
      const currentExpired =
        user.expired_at && new Date(user.expired_at) > now
          ? new Date(user.expired_at)
          : now;

      const extendedDate = new Date(
        currentExpired.getTime() + 30 * 24 * 60 * 60 * 1000 // 30 hari
      );
      extendedDate.setHours(0, 0, 0, 0);
      user.expired_at = extendedDate;

      await user.save({ transaction: t });

      await extensionRequest.update(
        {
          status: "approved",
          approved_at: new Date(),
          user_id: user.user_id,
        },
        { transaction: t }
      );

      await t.commit();

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
        .send({ message: "Extension approved and user updated.", user });
    } else if (action === "reject") {
      await extensionRequest.update(
        {
          status: "rejected",
          processed_at: new Date(),
        },
        { transaction: t }
      );

      await t.commit();

      await sendMail({
        to: extensionRequest.email,
        subject: "Permintaan Perpanjangan Ditolak",
        html: `Halo ${extensionRequest.username},<br><br>Mohon maaf, permintaan perpanjangan akun Anda ditolak. Silakan hubungi layanan dukungan untuk informasi lebih lanjut.<br><br>Terima kasih.`,
      });

      return res
        .status(200)
        .send({ message: "Extension request rejected successfully." });
    } else {
      await t.rollback();
      return res.status(400).send({ message: "Invalid action." });
    }
  } catch (error) {
    await t.rollback();
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
      if (status.includes(',')) {
        const statuses = status.split(',');
        where.status = { [Op.in]: statuses };
      } else {
        where.status = status;
      }
    }

    if (search) {
      const searchNum = parseInt(search);
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { proof_number: { [Op.iLike]: `%${search}%` } },
        ...(!isNaN(searchNum) ? [{ activation_id: searchNum }] : []),
      ];
    }

    const activations = await Activation.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).send({
      total: activations.count,
      activations: activations.rows,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(activations.count / parseInt(limit)),
      currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
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
      if (status.includes(',')) {
        const statuses = status.split(',');
        where.status = { [Op.in]: statuses };
      } else {
        where.status = status;
      }
    }

    if (search) {
      const searchNum = parseInt(search);
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { proof_number: { [Op.iLike]: `%${search}%` } },
        ...(!isNaN(searchNum) ? [{ activation_id: searchNum }] : []),
      ];
    }

    const extensions = await Activation.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).send({
      total: extensions.count,
      extensions: extensions.rows,
      limit: parseInt(limit),
      offset: parseInt(offset),
      totalPages: Math.ceil(extensions.count / parseInt(limit)),
      currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
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

const toUTCISODateString = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Helper function to format a date object to 'YYYY-MM' using UTC for monthly aggregation.
 * @param {Date} date - The date object to format.
 * @returns {string} The formatted month string.
 */
const toUTCMonthString = (date) => {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};


exports.getDashboardData = async (req, res) => {
  try {
    const { period = '30d', startDate: queryStartDate, endDate: queryEndDate } = req.query;

    let endDate = new Date();
    let startDate = new Date();
    let isMonthly = false;

    // Determine the date range and aggregation level based on the period
    if (period === '12m') {
      isMonthly = true;
      // Set endDate to the end of the current month to get the full month's data
      endDate.setUTCHours(23, 59, 59, 999);
      endDate.setUTCDate(new Date(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0).getUTCDate());

      // Calculate startDate to be the first day, 11 months ago, creating a 12-month period
      startDate = new Date(endDate);
      startDate.setUTCMonth(startDate.getUTCMonth() - 11);
      startDate.setUTCDate(1);
      startDate.setUTCHours(0, 0, 0, 0);

    } else if (period === '7d') {
      startDate.setUTCDate(endDate.getUTCDate() - 6);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);
    } else { // Default to 30d
      startDate.setUTCDate(endDate.getUTCDate() - 29);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);
    }
    
    // Dynamically choose date function based on DB dialect to prevent errors
    const dialect = db.sequelize.getDialect();
    const dateFunction = isMonthly
      ? (
          dialect === 'mysql'
            // MySQL-specific function
            ? [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('approved_at'), '%Y-%m'), 'date']
            // Standard SQL function for PostgreSQL and others
            : [db.sequelize.fn('TO_CHAR', db.sequelize.col('approved_at'), 'YYYY-MM'), 'date']
        )
      : [db.sequelize.fn('DATE', db.sequelize.col('approved_at')), 'date'];

    const results = await Activation.findAll({
      attributes: [
        dateFunction,
        'activation_type',
        [db.sequelize.fn('COUNT', db.sequelize.col('activation_id')), 'count'],
      ],
      where: {
        status: 'approved',
        approved_at: { [Op.between]: [startDate, endDate] },
      },
      group: ['date', 'activation_type'],
      order: [['date', 'ASC']],
      raw: true,
    });

    const statsMap = new Map();
    const labels = [];

    // Initialize the map with all dates/months in the range to ensure no gaps
    if (isMonthly) {
        let loopDate = new Date(startDate);
        // Use a fixed loop for 12 months for reliability
        for (let i = 0; i < 12; i++) {
            const formattedMonth = toUTCMonthString(loopDate);
            labels.push(formattedMonth);
            statsMap.set(formattedMonth, { activations: 0, extensions: 0 });
            loopDate.setUTCMonth(loopDate.getUTCMonth() + 1);
        }
    } else {
        let loopDate = new Date(startDate);
        while (loopDate <= endDate) {
            const formattedDate = toUTCISODateString(loopDate);
            labels.push(formattedDate);
            statsMap.set(formattedDate, { activations: 0, extensions: 0 });
            loopDate.setUTCDate(loopDate.getUTCDate() + 1);
        }
    }
    
    // Populate the map with data from the database
    results.forEach((row) => {
      // The 'date' field from the query is already formatted as YYYY-MM or YYYY-MM-DD
      const dateKey = row.date;
      const count = parseInt(row.count, 10) || 0;

      if (statsMap.has(dateKey)) {
        const currentStats = statsMap.get(dateKey);
        if (row.activation_type === 'activation') {
          currentStats.activations = count;
        } else if (row.activation_type === 'extension') {
          currentStats.extensions = count;
        }
      }
    });

    // Convert map values to arrays for the final response
    const activationData = labels.map(label => statsMap.get(label)?.activations || 0);
    const extensionData = labels.map(label => statsMap.get(label)?.extensions || 0);

    const responsePayload = {
      labels,
      datasets: [
        { label: 'Aktivasi Baru', data: activationData },
        { label: 'Perpanjangan', data: extensionData },
      ],
    };

    res.status(200).send(responsePayload);
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).send({ message: 'Failed to fetch dashboard data', error: error.message });
  }
};
