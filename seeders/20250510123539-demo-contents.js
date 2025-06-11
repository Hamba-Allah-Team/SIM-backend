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
        image: 'image-1749658624225-272029231.jpg',
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
        image: 'image-1749658624225-272029231.jpg',
        published_date: new Date(),
        contents_type: 'artikel', // artikel islami
        user_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        mosque_id: 1,
        title: "Jadwal Kajian Subuh Ramadhan Bersama Ustaz Budi",
        content_description: "Masjid Al-Falah dengan senang hati mengumumkan **jadwal kajian Subuh rutin setiap hari selama bulan Ramadhan** bersama Ustaz Budi. Kajian ini akan fokus pada tema-tema seputar fiqh puasa, akhlak mulia, dan tadabbur Al-Qur'an untuk meningkatkan pemahaman dan keimanan jamaah. Kami mengundang seluruh lapisan masyarakat untuk memanfaatkan waktu Subuh yang berkah ini guna menimba ilmu agama langsung dari ahlinya. Mari kita ramaikan masjid dan penuhi hati dengan cahaya ilmu di bulan yang penuh rahmat ini.",
        image: "image-1749658624225-272029231.jpg",
        published_date: new Date(),
        contents_type: "berita",
        user_id: 1,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
      mosque_id: 1,
      title: "Tips Menjaga Kesehatan Selama Berpuasa Ramadhan",
      content_description: "Berpuasa di bulan Ramadhan adalah ibadah yang mulia, namun menjaga kesehatan tubuh agar tetap prima selama berpuasa juga sangat penting. Artikel ini menyajikan **tips-tips praktis dan mudah** untuk menjaga stamina, hidrasi, dan nutrisi tubuh Anda agar tidak lemas dan tetap bugar sepanjang hari. Kami akan membahas pola makan sahur dan berbuka yang seimbang, pentingnya asupan cairan, serta olahraga ringan yang bisa dilakukan saat puasa. Dengan panduan ini, semoga ibadah puasa Anda menjadi lebih optimal.",
      image: "image-1749658624225-272029231.jpg",
      published_date: new Date(),
      contents_type: "artikel",
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      mosque_id: 1,
      title: "Donasi Ramadhan: Raih Berkah dengan Berbagi",
      content_description: "Masjid Al-Falah membuka kesempatan bagi para dermawan untuk **berdonasi di bulan Ramadhan** ini. Donasi Anda akan digunakan untuk berbagai program sosial seperti penyediaan takjil berbuka puasa, paket sembako untuk dhuafa, santunan anak yatim, dan kebutuhan operasional masjid selama Ramadhan. Setiap kebaikan yang Anda berikan akan dilipatgandakan pahalanya di bulan yang suci ini. Mari bersama-sama meraih berkah dan kebahagiaan dengan berbagi kepada sesama yang membutuhkan.",
      image: "image-1749658624225-272029231.jpg",
      published_date: new Date(),
      contents_type: "berita",
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      mosque_id: 1,
      title: "Mengenal Sejarah Nuzulul Qur’an: Peristiwa Turunnya Al-Qur’an",
      content_description: "Setiap tanggal 17 Ramadhan, umat Islam memperingati **Nuzulul Qur’an**, yaitu peristiwa penting turunnya Al-Qur’an untuk pertama kalinya kepada Nabi Muhammad SAW. Artikel ini akan mengajak Anda menelusuri kembali **sejarah Nuzulul Qur’an**, mulai dari wahyu pertama di Gua Hira hingga implikasinya bagi kehidupan umat manusia. Kita akan memahami konteks historis, makna spiritual, dan pelajaran berharga yang dapat kita ambil dari peristiwa agung ini untuk memperkuat keimanan kita.",
      image: "image-1749658624225-272029231.jpg",
      published_date: new Date(),
      contents_type: "artikel",
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      mosque_id: 1,
      title: "Lomba Adzan dan Hafalan Surat Pendek untuk Anak-anak Ramadhan Ceria",
      content_description: "Dalam rangka memeriahkan bulan suci Ramadhan dan menumbuhkan semangat keagamaan pada generasi muda, Masjid Al-Falah akan menyelenggarakan **Lomba Adzan dan Hafalan Surat Pendek** untuk anak-anak. Lomba ini terbuka bagi peserta usia 5-12 tahun dengan berbagai kategori. Selain sebagai ajang kompetisi, kegiatan ini diharapkan dapat memotivasi anak-anak untuk lebih mencintai Al-Qur’an dan masjid. Hadiah menarik menanti para pemenang! Segera daftarkan putra-putri Anda.",
      image: "image-1749658624225-272029231.jpg",
      published_date: new Date(),
      contents_type: "berita",
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      mosque_id: 1,
      title: "Panduan Lengkap Itikaf di Sepuluh Hari Terakhir Ramadhan",
      content_description: "Sepuluh hari terakhir bulan Ramadhan adalah periode yang sangat istimewa, di mana umat Muslim dianjurkan untuk memperbanyak ibadah, salah satunya dengan **itikaf**. Artikel ini menyediakan **panduan lengkap itikaf**, mulai dari niat, rukun, syarat, hingga hal-hal yang membatalkan itikaf. Kami juga akan membahas keutamaan itikaf di masjid dan bagaimana memaksimalkan ibadah ini untuk meraih malam Lailatul Qadar. Mari kita manfaatkan kesempatan emas ini untuk mendekatkan diri kepada Allah SWT.",
      image: "image-1749658624225-272029231.jpg",
      published_date: new Date(),
      contents_type: "artikel",
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },{
      mosque_id: 1,
      title: 'Kajian Subuh Rutin Setiap Sabtu di Masjid Al-Falah',
      content_description: 'Masjid Al-Falah mengadakan kajian subuh setiap hari Sabtu pagi yang dibawakan oleh ustadz-ustadz ternama. Kajian ini terbuka untuk jamaah umum.',
      image: 'image-1749658624225-272029231.jpg',
      published_date: new Date(),
      contents_type: 'berita',
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      mosque_id: 1,
      title: 'Masjid Al-Falah Gelar Penggalangan Dana untuk Korban Bencana',
      content_description: 'Dalam rangka membantu saudara-saudara yang terdampak bencana, Masjid Al-Falah mengadakan kegiatan penggalangan dana yang akan disalurkan melalui lembaga terpercaya.',
      image: 'image-1749658624225-272029231.jpg',
      published_date: new Date(),
      contents_type: 'berita',
      user_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      mosque_id: 1,
      title: "Masjid Al-Falah Menerima Pembayaran Zakat Fitrah dan Zakat Maal",
      content_description: "Menjelang akhir Ramadhan, Masjid Al-Falah siap menerima dan menyalurkan **Zakat Fitrah dan Zakat Maal** dari umat Muslim. Kami menyediakan layanan yang mudah dan transparan bagi Anda yang ingin menunaikan kewajiban zakat. Tim amil zakat kami akan memastikan setiap zakat yang terkumpul disalurkan secara tepat sasaran kepada para mustahik yang berhak, sesuai dengan syariat Islam. Dengan menunaikan zakat melalui Masjid Al-Falah, semoga harta kita diberkahi dan dibersihkan oleh Allah SWT.",
      image: "image-1749658624225-272029231.jpg",
      published_date: new Date(),
      contents_type: "berita",
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
