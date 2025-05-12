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
    return queryInterface.bulkInsert('mosques', [
      {
        name: 'Masjid Al-Hikmah',
        address: 'Jl. Merpati No. 10',
        description: 'Masjid besar di pusat kota.',
        image: 'alhikmah.jpg',
        phone_whatsapp: '081234567890',
        email: 'alhikmah@example.com',
        facebook: 'facebook.com/masjidalhikmah',
        instagram: 'instagram.com/masjidalhikmah',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Masjid An-Nur',
        address: 'Jl. Cempaka No. 20',
        description: 'Masjid dengan kegiatan keagamaan aktif.',
        image: 'annur.jpg',
        phone_whatsapp: '089876543210',
        email: 'annur@example.com',
        facebook: 'facebook.com/masjidannur',
        instagram: 'instagram.com/masjidannur',
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
    return queryInterface.bulkDelete('mosques', null, {});
  }
};
