const { up } = require("../migrations/20250506021842-create-reservations");
const db = require("../models");
const Reservation = db.reservation;
const { Op } = require("sequelize");

exports.createReservation = async (req, res) => {
    try {
        const {room_id, name, phone_number, description, reservation_date, start_time, end_time } = req.body;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }

        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;

        const start = new Date('${reservation_date}T${start_time}');
        const end = new Date('${reservation_date}T${end_time}');
        
        if (phone_number && !/^\+?[0-9]+$/.test(phone_number)) {
            return res.status(400).json({ message: "Nomor telepon hanya boleh berisi angka dan opsional tanda plus di depan." });
        }

        if (phone_number && !/^\d{10,15}$/.test(phone_number)) {
            return res.status(400).json({ message: "Nomor telepon harus terdiri dari 10 hingga 15 digit." });
        }

        if (start >= end) {
            return res.status(400).json({ message: "Waktu mulai harus lebih awal dari waktu selesai." });
        }

        const today = new Date();
        if(new Date(reservation_date) < today) {
            return res.status(400).json({ message: "Tanggal reservasi tidak boleh kurang dari hari ini." });
        }

        const existingReservation = await Reservation.findOne({
            where: {
                mosque_id,
                room_id,
                reservation_date,
                [Op.or]: [
                    {
                        start_time: {
                            [Op.between]: [start_time, end_time]
                        }
                    },
                    {
                        end_time: {
                            [Op.between]: [start_time, end_time]
                        }
                    }
                ]
            }
        });

        if (existingReservation) {
            return res.status(400).json({ message: "Reservasi sudah ada pada waktu tersebut." });
        }

        // Buat reservasi baru
        const newReservation = await Reservation.create({
            mosque_id,
            room_id,
            name,
            phone_number,
            description,
            reservation_date,
            start_time,
            end_time,
            admin_id: user_id
        });

        res.status(201).send({
            message: "Reservasi berhasil dibuat.",
            data: newReservation
        });
    } catch (error) {
        console.error("Error creating reservation:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat membuat reservasi" });
    }
}

exports.getReservations = async (req, res) => {
    try {
        const { search = "", filter = "all", sortOrder = 'DESC', limit = 10, page = 1 } = req.query;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }

        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const mosque_id = user.mosque_id;

        const listReservation = await Reservation.findAll({
            where: { 
                mosque_id,
                [Op.or]: [
                    {
                        name: {
                            [Op.like]: `%${search}%`
                        }
                    },
                    {
                        phone_number: {
                            [Op.like]: `%${search}%`
                        }
                    },
                ],
                ...(filter !== 'all' ? { status: filter } : {})
            },
            order: [['created_at', sortOrder]],
            limit: parseInt(limit),
            offset: parseInt((page - 1) * limit)
        });

        res.status(200).send({
            data: listReservation.rows,
            totalCount: listReservation.count,
            totalPage: Math.ceil(listReservation.count / limit),
            currentPage: parseInt(page),
        });
    } catch (error) {
        console.error("Error fetching reservations:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil daftar reservasi" });
    }
}

exports.getReservationById = async (req, res) => {
    try{
        const { id } = req.params;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }
        
        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }

        const existingReservation = await Reservation.findOne({
            where: {
                reservation_id: id,
            }
        });

        if (!existingReservation) {
            return res.status(404).send({ message: "Reservasi tidak ditemukan." });
        }

        res.status(200).send({
            message: "Detail reservasi ditemukan.",
            data: existingReservation
        });

    } catch (error) {
        console.error("Error fetching reservation by ID:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat mengambil data reservasi" });
    }
}

exports.updateReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const { room_id, name, phone_number, description, reservation_date, start_time, end_time } = req.body;

        const user_id = req.userId;
        const user = await db.user.findByPk(user_id);
        if (!user) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }

        if(user.role !== 'admin') {
            return res.status(403).send({ message: "Akses ditolak. Hanya Admin yang bisa mengakses" });
        }
        
        const mosque_id = user.mosque_id;

        const existingReservation = await Reservation.findOne({
            where: {
                reservation_id: id,
                mosque_id
            }
        });

        if (!existingReservation) {
            return res.status(404).send({ message: "Reservasi tidak ditemukan." });
        }

        if (phone_number && !/^\+?[0-9]+$/.test(phone_number)) {
            return res.status(400).json({ message: "Nomor telepon hanya boleh berisi angka dan opsional tanda plus di depan." });
        }

        if (phone_number && !/^\d{10,15}$/.test(phone_number)) {
            return res.status(400).json({ message: "Nomor telepon harus terdiri dari 10 hingga 15 digit." });
        }

        if (start >= end) {
            return res.status(400).json({ message: "Waktu mulai harus lebih awal dari waktu selesai." });
        }

        const today = new Date();
        if(new Date(reservation_date) < today) {
            return res.status(400).json({ message: "Tanggal reservasi tidak boleh kurang dari hari ini." });
        }

        // Update reservasi
        await updateReservation.update({
            room_id,
            name,
            phone_number,
            description,
            reservation_date,
            start_time,
            end_time,
            admin_id: user_id
        }, {
            where: {
                reservation_id: id
            }
        });

        res.status(200).send({
            message: "Reservasi berhasil diperbarui.",
            data: updateReservation
        });

    } catch (error) {
        console.error("Error updating reservation:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat memperbarui reservasi" });
    }
}

exports.deleteReservation = async (req, res) => {
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

        // Cek apakah reservasi sudah ada
        const existingReservation = await Reservation.findOne({
            where: {
                reservation_id: id,
                mosque_id
            }
        });

        if (!existingReservation) {
            return res.status(404).send({ message: "Reservasi tidak ditemukan." });
        }

        // Hapus reservasi
        await Reservation.destroy({
            where: {
                reservation_id: id
            }
        });

        res.status(200).send({
            message: "Reservasi berhasil dihapus."
        });

    } catch (error) {
        console.error("Error deleting reservation:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat menghapus reservasi" });
    }
}