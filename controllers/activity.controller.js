const db = require("../models");
const Activity = db.activity;
const User = db.user; // Pastikan model User ada di db.user
const fs = require('fs'); // Modul File System untuk menghapus file
const path = require('path'); // Untuk bekerja dengan path file
const Mosque = db.mosques;
const { format } = require('date-fns'); // 👈 Impor date-fns
const { id } = require('date-fns/locale'); // 👈 Impor locale Indonesia
const { Op } = require("sequelize");
const projectRoot = path.resolve(__dirname, '../../'); // Sesuaikan jika struktur folder berbeda


// Fungsi helper untuk menghapus file gambar
const deleteImageFile = (filePath) => {
    if (filePath) {
        // const fullPath = path.join(__dirname, '../../', filePath); // Sesuaikan '../..' jika struktur folder berbeda
        const fileSystemPath = path.join(projectRoot, filePath.startsWith('/') ? filePath.substring(1) : filePath);


        fs.unlink(fileSystemPath, (err) => {
            if (err) {
                console.error("Gagal menghapus file gambar lama:", err.message);
            } else {
                console.log("File gambar lama berhasil dihapus:", fileSystemPath);
            }
        });
    }
};


// 📥 CREATE activity
exports.createActivity = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        if (!user) {
            // Jika ada file terupload karena user tidak ditemukan, hapus file tersebut
            if (req.file) deleteImageFile(path.join('uploads', req.file.filename));
            return res.status(404).json({ message: "User not found" });
        }

        const {
            event_name,
            event_description,
            start_date,
            end_date,
            start_time,
            end_time
        } = req.body;

        let imageUrl = null;
        if (req.file) {
            // Simpan path yang bisa diakses publik, contoh: /uploads/namafile.jpg
            imageUrl = `/uploads/${req.file.filename}`;
        } else {
            // Jika gambar tidak wajib, Anda bisa membiarkannya null
            // Jika wajib, berikan error:
            // return res.status(400).json({ message: "Gambar kegiatan wajib diunggah." });
        }

        const newActivity = await Activity.create({
            mosque_id: user.mosque_id, // Pastikan user memiliki mosque_id
            user_id: userId,
            event_name,
            image: imageUrl,
            event_description,
            start_date,
            end_date,
            start_time,
            end_time
        });

        res.status(201).json(newActivity);
    } catch (error) {
        console.error("Error creating activity:", error);
        // Jika ada file terupload karena error lain, hapus file tersebut
        if (req.file) deleteImageFile(path.join('uploads', req.file.filename));

        // Tangani error dari multer (misal, tipe file tidak valid)
        if (error.message && error.message.includes("Hanya file JPEG, JPG, PNG yang diizinkan!")) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to create activity" });
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
            if (req.file) deleteImageFile(path.join('uploads', req.file.filename));
            return res.status(404).json({ message: "User not found" });
        }

        const activity = await Activity.findOne({
            where: {
                activities_id: req.params.id,
                mosque_id: user.mosque_id // Pastikan user.mosque_id ada
            }
        });

        if (!activity) {
            if (req.file) deleteImageFile(path.join('uploads', req.file.filename));
            return res.status(404).json({ message: "Activity not found" });
        }

        const oldImagePath = activity.image; // Simpan path gambar lama
        let newImagePath = oldImagePath;

        if (req.file) {
            newImagePath = `/uploads/${req.file.filename}`;
        }

        // Dapatkan data lain dari body
        const {
            event_name,
            event_description,
            start_date,
            end_date,
            start_time,
            end_time
        } = req.body;


        await activity.update({
            event_name: event_name || activity.event_name,
            image: newImagePath, // Gunakan path baru atau path lama jika tidak ada file baru
            event_description: event_description || activity.event_description,
            start_date: start_date || activity.start_date,
            end_date: end_date || activity.end_date,
            start_time: start_time || activity.start_time,
            end_time: end_time || activity.end_time,
            // user_id tidak diupdate di sini, karena user yg mengupdate mungkin admin, bukan pembuat asli
            // mosque_id juga tidak diupdate
        });

        // Jika ada file baru diupload DAN path gambar lama ada (bukan null/kosong) DAN path baru beda dari path lama
        if (req.file && oldImagePath && oldImagePath !== newImagePath) {
            deleteImageFile(oldImagePath);
        }

        res.json({ message: "Activity updated successfully", activity });
    } catch (error) {
        console.error("Error updating activity:", error);
        if (req.file) deleteImageFile(path.join('uploads', req.file.filename)); // Hapus file baru jika ada error saat update DB

        if (error.message && error.message.includes("Hanya file JPEG, JPG, PNG yang diizinkan!")) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Failed to update activity" });
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