const db = require("../models");
const Room = db.reservation_room;
const { Op } = require("sequelize");

const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];

const isValidImage = (image) => {
    return validImageTypes.includes(image.mimetype);
};

exports.createRoom = async (req, res) => {
    try {
        const {place_name, description, facilities, capacity } = req.body;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }

        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;

        if (!place_name || !description || !facilities || !capacity) {
            return res.status(400).send({ message: "Nama ruangan, deskripsi, fasilitas, dan kapasitas wajib diisi." });
        }
        if (req.file) {
            if (!isValidImage(req.file)) {
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
            image: req.file ? req.file.filename : null,
            description,
            facilities,
            capacity
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
        const { page = 1, limit = 10, search = "", order = "DESC" } = req.query;

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
        const { place_name, description, facilities, capacity } = req.body;
        const fs = require("fs");
        const path = require("path");

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }

        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;
        

        const deleteImage = req.body.delete_image === 'true';

        if (!place_name || !description || !facilities || !capacity) {
            return res.status(400).send({ message: "Nama ruangan, deskripsi, fasilitas, dan kapasitas wajib diisi." });
        }
        // Cek apakah ruangan sudah ada
        const existingRoom = await Room.findByPk(id);

        if (!existingRoom) {
            return res.status(404).json({ message: "Ruangan tidak ditemukan." });
        }

        if (existingRoom.mosque_id !== mosque_id) {
            return res.status(403).send({ message: "Anda tidak memiliki izin untuk mengedit ruangan ini." });
        }
        let image = null;

        if (deleteImage) {
            if (existingRoom.image) {
                const imagePath = path.join(__dirname, "../uploads", existingRoom.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            image = null;
        } else if (req.file) {
            if (!isValidImage(req.file)) {
                return res.status(400).send({ message: "Format gambar tidak valid. Harus PNG, JPG, atau JPEG." });
            }
            if (existingRoom.image) {
                const imagePath = path.join(__dirname, "../uploads", existingRoom.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            image = req.file.filename;
        }

        const updatedRoom = await Room.update({
            place_name,
            image: image,
            description,
            facilities,
            capacity
        }, {
            where: {
                room_id: id,
                mosque_id,
                deleted_at: null
            }
        });

        if (!updatedRoom) {
            return res.status(404).json({ message: "Ruangan tidak ditemukan." });
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
        const existingRoom = await Room.findByPk(id);

        if (!existingRoom) {
            return res.status(404).send({ message: "Ruangan tidak ditemukan." });
        }

        if( existingRoom.mosque_id !== mosque_id) {
            return res.status(403).send({ message: "Anda tidak memiliki izin untuk menghapus ruangan ini." });
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

exports.getPublicRooms = async (req, res) => {
    try {
        const { slug } = req.params;

        const mosque = await db.mosques.findOne({
            where: {
                slug
            }
        });

        if (!mosque) {
            return res.status(404).send({ message: "Masjid tidak ditemukan." });
        }

        const listRoom = await Room.findAll({
            where: {
                mosque_id: mosque.mosque_id,
                deleted_at: null
            },
            order: [['room_id', 'ASC']]
        });

        res.status(200).send({
            data: listRoom
        });
    } catch (error) {
        console.error("Error fetching public rooms:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar ruangan" });
    }
}

// exports.getPublicRoomById = async (req, res) => {
//     try {
//         const { slug, id } = req.params;

//         const mosque = await db.mosques.findOne({
//             where: {
//                 slug
//             }
//         });

//         if (!mosque) {
//             return res.status(404).send({ message: "Masjid tidak ditemukan." });
//         }

//         const detailroom = await Room.findOne({
//             where: {
//                 room_id: id,
//                 mosque_id: mosque.mosque_id,
//                 deleted_at: null
//             },
//             includes: [{
//                 model: db.reservation,
//                 as: 'reservations',
//                 attributes: ['reservation_id', 'user_id', 'room_id', 'start_time', 'end_time', 'status']
//             }]
//         });

//         if (!detailroom) {
//             return res.status(404).send({ message: "Ruangan tidak ditemukan." });
//         }

//         res.status(200).send({
//             message: "Detail ruangan ditemukan.",
//             data: detailroom
//         });

//     } catch (error) {
//         console.error("Error fetching public room by ID:", error);
//         res.status(500).json({ message: "Terjadi kesalahan saat mengambil detail ruangan" });
//     }
// }