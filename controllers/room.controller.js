const db = require("../models");
const Room = db.reservation_room;
const { Op } = require("sequelize");

const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];

const isValidImage = (image) => {
    return validImageTypes.includes(image.mimetype);
};

exports.createRoom = async (req, res) => {
    try {
        const {place_name, image, description } = req.body;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }

        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;

        if(image) {
            if (!isValidImage(image)) {
                return res.status(400).send({ message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG." });
            }
        }

        // Cek apakah ruangan sudah ada
        const existingRoom = await Room.findOne({
            where: {
                mosque_id,
                place_name
            }
        });

        if (existingRoom) {
            return res.status(400).json({ message: "Room already exists" });
        }

        // Buat ruangan baru
        const newRoom = await Room.create({
            mosque_id,
            place_name,
            image: image || null,
            description: description || null
        });

        res.status(201).send({
            message: "Ruangaan berhasil dibuat.",
            data: newRoom
        });
    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat membuat ruangan" });
    }
};

exports.getRooms = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", order = "ASC" } = req.query;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }
        if(user.role != 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;
        const sortorder = order.toUpperCase() == "DESC" ? "DESC" : "ASC";

        const listRoom = await Room.findAndCountAll({
            where: {
                mosque_id,
                deleted_at: null,
                place_name: {
                    [Op.iLike]: `%${search}%`
                }
            },
            order: [['place_name', sortorder]],
            limit: parseInt(limit),
            offset: parseInt((page - 1) * limit)
        });


        res.status(200).send({
            data: listRoom.rows,
            totalCount: listRoom.count,
            totalPages: Math.ceil(listRoom.count / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ mesage: "Terjadi kesalahan saat mengambil daftar ruangan" });
    }
};

exports.getRoomById = async (req, res) => {
    try {
        const { id } = req.params;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }
        
        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;
        const detailroom = await Room.findOne({
            where: {
                room_id: id,
                mosque_id,
                deleted_at: null
            }
        });

        if (!detailroom) {
            return res.status(404).send({ message: "Ruangan tidak ditemukan." });
        }

        res.status(200).send({
            message: "Detail ruangan ditemukan.",
            data: detailroom
        });

    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil detail ruangan" });
    }
};

exports.updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { place_name, image, description } = req.body;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }

        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;

        if(image) {
            if (!isValidImage(image)) {
                return res.status(400).send({ message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG." });
            }
        }

        // Cek apakah ruangan sudah ada
        const existingRoom = await Room.findOne({
            where: {
                room_id: id,
                mosque_id,
                deleted_at: null,
            }
        });

        if (existingRoom) {
            return res.status(400).json({ message: "Room already exists" });
        }

        // Update ruangan
        const updatedRoom = await Room.update({
            place_name,
            image,
            description
        }, {
            where: {
                room_id: id,
                mosque_id,
                deleted_at: null
            }
        });

        if (!updatedRoom[0]) {
            return res.status(404).send({ message: "Ruangan tidak ditemukan." });
        }

        res.status(200).send({
            message: "Ruangan berhasil diperbarui.",
            data: updatedRoom
        });

    } catch (error) {
        console.error("Error updating room:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat memperbarui ruangan" });
    }
}

exports.deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }

        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;

        // Cek apakah ruangan sudah ada
        const existingRoom = await Room.findOne({
            where: {
                room_id: id,
                mosque_id,
                deleted_at: null,
            }
        });

        if (!existingRoom) {
            return res.status(404).send({ message: "Ruangan tidak ditemukan." });
        }

        // Hapus ruangan
        await Room.update({
            deleted_at: new Date()
        }, {
            where: {
                room_id: id,
                mosque_id,
                deleted_at: null
            }
        });

        res.status(200).send({
            message: "Ruangan berhasil dihapus.",
            data: existingRoom
        });

    } catch (error) {
        console.error("Error deleting room:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat menghapus ruangan" });
    }
}