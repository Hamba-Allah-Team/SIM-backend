const db = require("../models");
const User = db.user;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

exports.signup = async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    console.log(req.body);

    const user = await User.create(
      {
        mosque_id: null,
        username: req.body.username,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 8),
        name: req.body.name,
        role: req.body.role || "admin",
        status: req.body.status || "active",
      },
      { transaction: t }
    );

    let mosqueId = req.body.mosque_id;

    if (!mosqueId && user.role === "admin") {
      const mosque = await db.mosques.create(
        {
          name: req.body.mosque_name,
          address: req.body.mosque_address,
          description: req.body.mosque_description || null,
          phone_whatsapp: req.body.mosque_phone_whatsapp || null,
          email: req.body.mosque_email || null,
          facebook: req.body.mosque_facebook || null,
          instagram: req.body.mosque_instagram || null,
        },
        { transaction: t }
      );

      mosqueId = mosque.mosque_id;

      await user.update({ mosque_id: mosqueId }, { transaction: t });
    }

    await t.commit();
    res.status(201).send({ message: "User registered successfully!" });
  } catch (error) {
    await t.rollback();
    console.log(error);
    res.status(500).send({ message: error.message });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .send({ message: "Email and password are required." });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Invalid Password!",
      });
    }

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION,
    });

    res.status(200).send({
      id: user.user_id,
      username: user.username,
      email: user.email,
      accessToken: token,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ["user_id", "username", "email"],
    });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    res.status(200).send({ message: "You have been logged out successfully." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
