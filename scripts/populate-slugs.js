const db = require('../models'); // Sesuaikan path ke models Anda
const Mosque = db.mosques;

// Fungsi untuk membuat slug
const slugify = (text) => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const populateSlugs = async () => {
    try {
        const mosques = await Mosque.findAll({ where: { slug: null } });
        console.log(`Menemukan ${mosques.length} masjid tanpa slug.`);

        for (const mosque of mosques) {
            const newSlug = slugify(mosque.name);
            mosque.slug = newSlug;
            await mosque.save();
            console.log(`Slug untuk '${mosque.name}' diatur menjadi '${newSlug}'`);
        }

        console.log("Selesai mengisi semua slug.");
    } catch (error) {
        console.error("Gagal mengisi slug:", error);
    } finally {
        await db.sequelize.close();
    }
};

populateSlugs();