'use strict';

const { image } = require('pdfkit');

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
    await queryInterface.bulkInsert('reservations_room', [
      {
        mosque_id: 1, // pastikan mosque_id:1 tersedia dari seeder mosques
        place_name: 'Ruang Serbaguna',
        image: 'ruang-serbaguna.jpg',
        description: 'Digunakan untuk pengajian dan kegiatan komunitas.',
        facilities: 'AC, Proyektor, Kursi, Meja',
        capacity: 30,
        created_at: new Date(),
        updated_at: new Date(),
        image: 'default_room.png'
      },
      {
        mosque_id: 1,
        place_name: 'Aula Utama',
        image: 'aula-utama.jpg',
        description: 'Aula utama untuk seminar dan kajian besar.',
        facilities: 'AC, Proyektor, Papan Tulis',
        capacity: 40,
        created_at: new Date(),
        updated_at: new Date(),
        image: 'default_room.png'
      },
      {
        mosque_id: 1,
        place_name: 'Ruang Kelas',
        image: 'ruang-kelas.jpg',
        description: 'Khusus untuk kegiatan belajar mengajar anak-anak.',
        facilities: 'AC, Papan Tulis',
        capacity: 20,
        created_at: new Date(),
        updated_at: new Date(),
        image: 'default_room.png'
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('reservations_room', null, {});
  }
};
