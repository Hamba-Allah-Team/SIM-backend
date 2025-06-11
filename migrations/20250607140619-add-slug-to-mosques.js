// migrations/[timestamp]-add-slug-to-mosques.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Menambahkan kolom 'slug' ke tabel 'mosques'
    await queryInterface.addColumn('mosques', 'slug', {
      type: Sequelize.STRING,
      allowNull: true, // 👈 Sementara izinkan null untuk data yang sudah ada
      unique: true,    // 👈 Sangat penting, setiap slug harus unik
    });

    // Setelah ini, Anda perlu menjalankan skrip untuk mengisi slug data yang sudah ada.
    // Setelah data lama terisi, Anda bisa membuat migrasi lain untuk mengubah allowNull menjadi false.
  },

  down: async (queryInterface, Sequelize) => {
    // Menghapus kolom 'slug' jika migrasi di-rollback
    await queryInterface.removeColumn('mosques', 'slug');
  }
};
