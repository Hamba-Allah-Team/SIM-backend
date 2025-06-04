const db = require("../models");
const Activity = db.activity;
const User = db.user; // Pastikan model User ada di db.user
const fs = require('fs'); // Modul File System untuk menghapus file
const path = require('path'); // Untuk bekerja dengan path file

// Fungsi helper untuk menghapus file gambar
const deleteImageFile = (filePath) => {
    if (filePath) {
        // filePath dari database mungkin /uploads/namafile.jpg
        // Ubah menjadi path absolut di server jika perlu
        const fullPath = path.join(__dirname, '../../', filePath); // Sesuaikan '../..' jika struktur folder berbeda
        // __dirname akan mengarah ke folder controllers
        // jadi kita naik dua level untuk ke root project
        // jika uploads ada di root. Atau pastikan filePath sudah benar.
        // Lebih aman jika filePath yang disimpan adalah relatif dari root uploads,
        // dan folder uploads ada di root proyek.
        // Misal: filePath = 'uploads/gambar.jpg' (relatif dari root project)
        // Maka fullPath = path.resolve(filePath)
        // Untuk skenario dimana filePath adalah '/uploads/namafile.jpg' dan 'uploads' ada di root project
        const projectRoot = path.resolve(__dirname, '../../'); // asumsi controller ada di src/controllers
        const fileSystemPath = path.join(projectRoot, filePath.startsWith('/') ? filePath.substring(1) : filePath);


        fs.unlink(fileSystemPath, (err) => {
            if (err) {
                console.error("Gagal menghapus file gambar lama:", err.message);
                // Tidak perlu menghentikan proses jika file tidak ditemukan (mungkin sudah dihapus atau path salah)
                // if (err.code !== 'ENOENT') {
                //   console.error("Error saat menghapus file:", err);
                // }
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

// --- Public Controllers (umumnya tidak berubah banyak, hanya memastikan path gambar benar) ---
exports.getPublicActivities = async (req, res) => {
    try {
        const mosqueId = req.params.mosque_id;
        if (!mosqueId) return res.status(400).json({ message: "Mosque ID is required." });

        const activities = await Activity.findAll({
            where: { mosque_id: mosqueId },
            attributes: {
                exclude: ['user_id'] // Mungkin user_id tidak perlu ditampilkan publik
            },
            order: [['start_date', 'ASC']] // Atau DESC, sesuai kebutuhan
        });
        res.json(activities);
    } catch (error) {
        console.error("Error fetching public activities:", error);
        res.status(500).json({ message: "Failed to retrieve public activities" });
    }
};

exports.getPublicActivityById = async (req, res) => {
    try {
        const { mosque_id, id } = req.params;
        if (!mosque_id || !id) return res.status(400).json({ message: "Mosque ID and Activity ID are required." });

        const activity = await Activity.findOne({
            where: {
                mosque_id,
                activities_id: id
            },
            attributes: {
                exclude: ['user_id'] // Mungkin user_id tidak perlu ditampilkan publik
            }
        });

        if (!activity) {
            return res.status(404).json({ message: "Activity not found" });
        }
        res.json(activity);
    } catch (error) {
        console.error("Error fetching public activity by ID:", error);
        res.status(500).json({ message: "Failed to retrieve activity detail" });
    }
};