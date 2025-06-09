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
    await queryInterface.bulkInsert('reservations', [
      {
        mosque_id: 1,
        room_id: 1,
        title: 'Kajian Remaja',
        name: 'Ahmad Yusuf',
        phone_number: '081234567890',
        description: 'Menggunakan aula untuk acara kajian remaja.',
        reservation_date: '2025-05-10',
        start_time: '08:00',
        end_time: '11:00',
        status: 'approved',
        admin_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 1,
        room_id: 2,
        title: 'Pengajian Ibu-Ibu',
        name: 'Fatimah Zahra',
        phone_number: '081298765432',
        description: 'Reservasi ruang serbaguna untuk pengajian ibu-ibu.',
        reservation_date: '2025-05-12',
        start_time: '13:00',
        end_time: '15:00',
        status: 'pending',
        admin_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 1,
        room_id: 3,
        title: 'Rapat Pengurus',
        name: 'Budi Santoso',
        phone_number: '085612345678',
        description: 'Rapat komite masjid.',
        reservation_date: '2025-05-15',
        start_time: '09:00',
        end_time: '10:30',
        status: 'completed',
        admin_id: 1,
        created_at: new Date(),
        updated_at: new Date()
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
    await queryInterface.bulkDelete('reservations', null, {});
  }
};
