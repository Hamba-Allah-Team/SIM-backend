const db = require("../models");
const Activity = db.activity;
const User = db.user; // Pastikan model User ada di db.user
const fs = require('fs'); // Modul File System untuk menghapus file
const path = require('path'); // Untuk bekerja dengan path file
const Mosque = db.mosques;
const { format } = require('date-fns'); // 👈 Impor date-fns
const { id } = require('date-fns/locale'); // 👈 Impor locale Indonesia
const { Op } = require("sequelize");

// Fungsi helper untuk menghapus file gambar
const deleteImageFile = (filePath) => {
    if (!filePath) return;
    try {
        const fullPath = path.resolve(__dirname, '../../', filePath.startsWith('/') ? filePath.substring(1) : filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`File lama berhasil dihapus: ${fullPath}`);
        }
    } catch (err) {
        console.error("Gagal menghapus file gambar:", err.message);
    }
};

exports.createActivity = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            if (req.file) deleteImageFile(`/uploads/${req.file.filename}`);
            return res.status(404).json({ message: "User not found" });
        }

        const {
            event_name,
            event_description,
            start_date,
            end_date, // Bisa jadi undefined
            start_time,
            end_time  // Bisa jadi undefined
        } = req.body;

        // Validasi input wajib dasar
        if (!event_name || !start_date || !start_time) {
            return res.status(400).json({ message: "Nama, tanggal mulai, dan waktu mulai wajib diisi." });
        }

        // 👈 PERBAIKAN: Logika baru untuk menangani tanggal & waktu
        const finalEndDate = end_date || start_date; // Jika end_date tidak ada, samakan dengan start_date

        if (new Date(finalEndDate) < new Date(start_date)) {
            return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
        }

        if (finalEndDate === start_date && end_time && start_time && end_time <= start_time) {
            return res.status(400).json({ message: "Jam selesai harus setelah jam mulai jika di hari yang sama." });
        }

        let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const newActivity = await Activity.create({
            mosque_id: user.mosque_id,
            user_id: userId,
            event_name,
            image: imageUrl,
            event_description,
            start_date,
            end_date: finalEndDate, // Gunakan tanggal akhir yang sudah pasti
            start_time,
            end_time: end_time || null, // Simpan null jika kosong
        });

        res.status(201).json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        if (req.file) deleteImageFile(`/uploads/${req.file.filename}`);
        res.status(500).json({ message: "Gagal membuat kegiatan" });
    }
};

// 📄 GET all activities for the logged-in user's mosque
exports.getActivities = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const activities = await Activity.findAll({
            where: { mosque_id: user.mosque_id }, // Pastikan user.mosque_id ada
            order: [['start_date', 'DESC']]
        });

        res.json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({ message: "Failed to retrieve activities" });
    }
};

// 📄 GET activity by ID for the logged-in user's mosque
exports.getActivityById = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const activity = await Activity.findOne({
            where: {
                activities_id: req.params.id,
                mosque_id: user.mosque_id // Pastikan user.mosque_id ada
            }
        });

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }
        res.json(activity);
    } catch (error) {
        console.error("Error fetching activity:", error);
        res.status(500).json({ message: "Failed to retrieve activity" });
    }
};

// ✏️ UPDATE activity
exports.updateActivity = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            if (req.file) deleteImageFile(`/uploads/${req.file.filename}`);
            return res.status(404).json({ message: "User tidak ditemukan" });
        }

        const activity = await Activity.findOne({
            where: {
                activities_id: req.params.id,
                mosque_id: user.mosque_id
            }
        });

        if (!activity) {
            if (req.file) deleteImageFile(`/uploads/${req.file.filename}`);
            return res.status(404).json({ message: "Kegiatan tidak ditemukan" });
        }

        const {
            event_name, event_description, start_date, end_date,
            start_time, end_time, deleteImage
        } = req.body;

        const updateData = {};

        // Hanya tambahkan field jika nilainya dikirim dari frontend
        if (event_name !== undefined) updateData.event_name = event_name;
        if (event_description !== undefined) updateData.event_description = event_description;
        if (start_time !== undefined) updateData.start_time = start_time;
        if (end_time !== undefined) updateData.end_time = end_time || null;

        // 👈 PERBAIKAN UTAMA: Penanganan tanggal untuk menghindari masalah zona waktu
        const handleDate = (dateString) => {
            if (!dateString) return null;
            // Membuat objek Date dengan menambahkan informasi waktu tengah hari untuk menghindari pergeseran
            return new Date(`${dateString}T12:00:00`);
        };

        if (start_date) updateData.start_date = handleDate(start_date);
        if (end_date) updateData.end_date = handleDate(end_date);


        // Logika untuk menangani gambar
        if (deleteImage === 'true') {
            deleteImageFile(activity.image);
            updateData.image = null;
        } else if (req.file) {
            deleteImageFile(activity.image);
            updateData.image = `/uploads/${req.file.filename}`;
        }

        // Validasi waktu menggunakan nilai final gabungan
        const finalStartDate = updateData.start_date || activity.start_date;
        let finalEndDate = updateData.end_date === undefined ? activity.end_date : updateData.end_date;
        if (!finalEndDate) finalEndDate = finalStartDate;

        const finalStartTime = updateData.start_time || activity.start_time;
        const finalEndTime = updateData.end_time === undefined ? activity.end_time : updateData.end_time;

        if (finalEndDate && finalStartDate && new Date(finalEndDate) < new Date(finalStartDate)) {
            return res.status(400).json({ message: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
        }

        if (finalEndDate && finalStartDate && new Date(finalEndDate).toISOString().split('T')[0] === new Date(finalStartDate).toISOString().split('T')[0]) {
            if (finalEndTime && finalStartTime && finalEndTime <= finalStartTime) {
                return res.status(400).json({ message: "Jam selesai harus setelah jam mulai pada hari yang sama." });
            }
        }

        await activity.update(updateData);

        const reloadedActivity = await activity.reload();
        res.json({ message: "Kegiatan berhasil diperbarui", activity: reloadedActivity });

    } catch (error) {
        console.error("Error saat memperbarui kegiatan:", error);
        if (req.file) deleteImageFile(`/uploads/${req.file.filename}`);
        res.status(500).json({ message: "Gagal memperbarui kegiatan" });
    }
};

// 🗑️ DELETE activity
exports.deleteActivity = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const activity = await Activity.findOne({
            where: {
                activities_id: req.params.id,
                mosque_id: user.mosque_id // Pastikan user.mosque_id ada
            }
        });

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }

        const imagePathToDelete = activity.image;
        await activity.destroy();

        // Hapus file gambar terkait jika ada
        if (imagePathToDelete) {
            deleteImageFile(imagePathToDelete);
        }

        res.json({ message: "Activity deleted successfully" });
    } catch (error) {
        console.error("Error deleting activity:", error);
        res.status(500).json({ message: "Failed to delete activity" });
    }
};

exports.getUpcomingActivities = async (req, res) => {
    try {
        const mosque = await Mosque.findOne({ where: { slug: req.params.slug } });
        if (!mosque) {
            return res.status(404).json({ message: "Masjid tidak ditemukan." });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingActivities = await Activity.findAll({
            where: {
                mosque_id: mosque.mosque_id,
                end_date: { [Op.gte]: today },
            },
            order: [['start_date', 'ASC']],
            limit: 3
        });

        // Format data agar sesuai dengan desain frontend, sekarang termasuk semua detail
        const formattedActivities = upcomingActivities.map(activity => {
            const activityDate = new Date(activity.start_date);
            return {
                id: activity.activities_id,
                day: format(activityDate, 'dd'),
                month: format(activityDate, 'MMM', { locale: id }),
                full_date: format(activityDate, "eeee, d MMMM yyyy", { locale: id }), // 👈 Tanggal lengkap
                title: activity.event_name,
                location: mosque.name,
                image: activity.image ? `${req.protocol}://${req.get('host')}${activity.image}` : null, // 👈 URL gambar lengkap
                description: activity.event_description, // 👈 Deskripsi
                time: activity.start_time ? activity.start_time.substring(0, 5) : "N/A" // 👈 Waktu
            };
        });

        res.json(formattedActivities);

    } catch (error) {
        console.error("Error fetching upcoming activities:", error);
        res.status(500).json({ message: "Gagal mengambil kegiatan mendatang" });
    }
};

exports.getAllUpcomingActivities = async (req, res) => {
    try {
        const mosque = await Mosque.findOne({ where: { slug: req.params.slug } });
        if (!mosque) {
            return res.status(404).json({ message: "Masjid tidak ditemukan." });
        }

        // 1. Ambil parameter 'page' dan 'limit' dari query URL
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default 10 item per halaman
        const offset = (page - 1) * limit;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 2. Gunakan findAndCountAll untuk mendapatkan data dan totalnya
        const { count, rows } = await Activity.findAndCountAll({
            where: {
                mosque_id: mosque.mosque_id,
                end_date: { [Op.gte]: today },
            },
            order: [['start_date', 'ASC']],
            limit,
            offset,
        });

        const formattedActivities = rows.map(activity => {
            const activityDate = new Date(activity.start_date);
            return {
                id: activity.activities_id,
                day: format(activityDate, 'dd'),
                month: format(activityDate, 'MMM', { locale: id }),
                full_date: format(activityDate, "eeee, d MMMM yyyy", { locale: id }),
                title: activity.event_name,
                location: mosque.name,
                image: activity.image ? `${req.protocol}://${req.get('host')}${activity.image}` : null,
                description: activity.event_description,
                time: activity.start_time ? activity.start_time.substring(0, 5) : "N/A"
            };
        });

        // 3. Kembalikan data bersama informasi paginasi
        res.json({
            data: formattedActivities,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
        });

    } catch (error) {
        console.error("Error fetching all upcoming activities:", error);
        res.status(500).json({ message: "Gagal mengambil data kegiatan" });
    }
};

exports.getPastActivities = async (req, res) => {
    try {
        const mosque = await Mosque.findOne({ where: { slug: req.params.slug } });
        if (!mosque) {
            return res.status(404).json({ message: "Masjid tidak ditemukan." });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count, rows } = await Activity.findAndCountAll({
            where: {
                mosque_id: mosque.mosque_id,
                // 👈 PERUBAHAN UTAMA: Mengambil kegiatan yang tanggal berakhirnya < hari ini
                end_date: {
                    [Op.lt]: today
                },
            },
            order: [['start_date', 'DESC']], // Diurutkan dari yang paling baru
            limit,
            offset,
        });

        const formattedActivities = rows.map(activity => {
            const activityDate = new Date(activity.start_date);
            return {
                id: activity.activities_id,
                day: format(activityDate, 'dd'),
                month: format(activityDate, 'MMM', { locale: id }),
                full_date: format(activityDate, "eeee, d MMMM yyyy", { locale: id }),
                title: activity.event_name,
                location: mosque.name,
                image: activity.image ? `${req.protocol}://${req.get('host')}${activity.image}` : null,
                description: activity.event_description,
                time: activity.start_time ? activity.start_time.substring(0, 5) : "N/A"
            };
        });

        res.json({
            data: formattedActivities,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
        });

    } catch (error) {
        console.error("Error fetching past activities:", error);
        res.status(500).json({ message: "Gagal mengambil data kegiatan lampau" });
    }
};