'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    return queryInterface.bulkInsert('contents', [
      {
        mosque_id: 1,
        title: 'Masjid Al-Falah Gelar Buka Puasa Bersama Setiap Hari Jumat',
        content_description: 'Mulai pekan ini, Masjid Al-Falah mengadakan acara buka puasa bersama setiap hari Jumat selama bulan Ramadhan. Kegiatan ini terbuka untuk umum.',
        image: 'bukber-jumat.jpg',
        published_date: new Date(),
        contents_type: 'berita', // pemberitaan aktual
        user_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 1,
        title: 'Keutamaan Membaca Al-Qur’an di Bulan Ramadhan',
        content_description: 'Membaca Al-Qur’an di bulan Ramadhan memiliki pahala yang berlipat ganda. Artikel ini membahas keutamaan tersebut berdasarkan hadits shahih.',
        image: 'keutamaan-quran.jpg',
        published_date: new Date(),
        contents_type: 'artikel', // artikel islami
        user_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return queryInterface.bulkDelete('contents', null, {});
  }
};
