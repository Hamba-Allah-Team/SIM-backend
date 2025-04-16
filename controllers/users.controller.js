const db = require("../models");
const User = db.user;
const { Op } = require("sequelize");

// READ with sort, filter, pagination
exports.getUsers = async (req, res) => {
    try {
      const {
        role,
        status,
        search,
        sortBy = "created_at",
        sortOrder = "DESC",
        limit = 10,
        page = 1,
      } = req.query;
      const offset = (page - 1) * limit;
  
      const where = {
        deleted_at: null,
      };
  
      if (status) where.status = status;
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } },
        ];
      }
  
      const validSortFields = ['created_at', 'username', 'name', 'email'];
      const orderField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  
      const order = [[orderField, sortOrder]];
  
      const users = await User.findAndCountAll({
        where,
        order,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
  
      res.status(200).send({
        total: users.count,
        page: parseInt(page),
        users: users.rows,
      });
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  };

  exports.updateUser = async (req, res) => {
    try {
        const loggedInUserId = req.userId;
        const targetUserId = req.params.id;

        const { name, email, username, status, role, expired_at } = req.body;

        if (!name || !email || !username) {
            return res.status(400).send({ message: "Name, email, and username are required." });
        }

        const user = await User.findByPk(targetUserId);
        if (!user || user.deleted_at) {
            return res.status(404).send({ message: "User not found." });
        }

        const loggedInUser = await User.findByPk(loggedInUserId);
        if (!loggedInUser) {
            return res.status(403).send({ message: "Unauthorized." });
        }

        if (loggedInUser.role === "superadmin") {
            await user.update({ name, email, username, status, role, expired_at });
            return res.status(200).send({ message: "User updated successfully by superadmin." });
        }

        if (loggedInUser.role === "admin") {
            if (loggedInUserId !== user.user_id) {
                return res.status(403).send({ message: "Admins can only update their own account." });
            }

            await user.update({ name, email, username });
            return res.status(200).send({ message: "Your profile has been updated." });
        }

        return res.status(403).send({ message: "You do not have permission to perform this action." });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).send({ message: err.message });
    }
};

exports.softDeleteUser = async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
  
      if (!user || user.deleted_at) {
        return res.status(404).send({ message: "User not found." });
      }
  
      await user.update({ deleted_at: new Date() });
  
      res.status(200).send({ message: "User soft deleted successfully." });
    } catch (err) {
      res.status(500).send({ message: err.message });
    }
  };
  