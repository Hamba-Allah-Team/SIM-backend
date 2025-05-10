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
    await queryInterface.bulkInsert('activities', [
      {
        mosque_id: 1,
        event_name: 'Pengajian Rutin Malam Jumat',
        image: 'pengajian-jumat.jpg',
        event_description: 'Pengajian rutin yang membahas tafsir Al-Qur\'an bersama Ustadz Ahmad setiap malam Jumat.',
        start_date: new Date('2025-05-09'),
        end_date: new Date('2025-05-09'),
        start_time: '19:00:00',
        end_time: '21:00:00',
        user_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 1,
        event_name: 'Bakti Sosial Masjid Al-Falah',
        image: 'baksos.jpg',
        event_description: 'Kegiatan sosial membagikan sembako untuk warga sekitar dalam rangka menyambut Idul Fitri.',
        start_date: new Date('2025-05-15'),
        end_date: new Date('2025-05-15'),
        start_time: '08:00:00',
        end_time: '12:00:00',
        user_id: 1,
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
    await queryInterface.bulkDelete('activities', null, {});
  }
};
