'use strict';

const { faker } = require('@faker-js/faker/locale/id_ID'); // Menggunakan faker untuk data yang lebih realistis

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const activities = [];
    const mosqueId = 1;
    const userId = 1;
    const today = new Date();

    const sampleImages = [
      '/uploads/activityImage-1749659671087-996824288.jpg',
    ];

    // Array berisi template judul kegiatan
    const eventTemplates = [
      "Kajian Rutin Tafsir",
      "Bakti Sosial & Pembagian Sembako",
      "Pengajian Akbar Bulanan Bersama Ustadz",
      "Lomba Hafalan Al-Qur'an Anak",
      "Pelatihan Manajemen Kurban",
      "Peringatan Isra Mi'raj",
      "Safari Dakwah & Tabligh Akbar",
      "Kerja Bakti Membersihkan Masjid",
      "Santunan Anak Yatim Piatu",
      "Kajian Fiqih Wanita (Muslimah)",
      "Kelas Tahsin Al-Qur'an",
      "Buka Puasa Bersama (Ramadhan)",
      "Sholat Idul Fitri & Halal Bihalal",
      "Penyembelihan Hewan Kurban Idul Adha",
      "Peringatan Maulid Nabi Muhammad SAW"
    ];

    // Generate 20 data kegiatan
    for (let i = 0; i < 20; i++) {
      // Membuat tanggal yang tersebar dari 10 hari lalu hingga 40 hari ke depan
      const eventDate = faker.date.between({ from: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), to: new Date(today.getTime() + 40 * 24 * 60 * 60 * 1000) });
      const startTimeHour = faker.number.int({ min: 8, max: 19 });

      activities.push({
        mosque_id: mosqueId,
        event_name: `${eventTemplates[i % eventTemplates.length]} ${i % 3 === 0 ? 'Spesial' : ''}`,
        image: sampleImages[i % sampleImages.length], // Menggunakan gambar sampel secara berulang
        event_description: faker.lorem.paragraph(3), // Membuat deskripsi dengan 3 paragraf
        start_date: eventDate,
        end_date: eventDate, // Diasumsikan kegiatan selesai di hari yang sama
        start_time: `${startTimeHour.toString().padStart(2, '0')}:00:00`,
        end_time: `${(startTimeHour + 2).toString().padStart(2, '0')}:00:00`,
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    await queryInterface.bulkInsert('activities', activities, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('activities', null, {});
  }
};
