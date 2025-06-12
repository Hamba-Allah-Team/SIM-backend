
## Sistem Informasi Masjid

Sistem Informasi Masjid adalah sebuah aplikasi berbasis web yang dirancang untuk membantu pengelolaan operasional masjid secara digital dan efisien. Sistem ini menyediakan fitur-fitur seperti manajemen keuangan, pengelolaan artikel dan berita, jadwal kegiatan, serta sistem reservasi fasilitas masjid. Terdapat tiga jenis pengguna (aktor) dalam sistem ini, yaitu Superadmin, Admin, dan Guest (tamu/pengunjung umum).

---
## Fitur Utama

1. Otentikasi Pengguna (Login/Register)
2. Manajemen Pengguna (khusus Superadmin)
3. Manajemen Kas Masjid (pemasukan dan pengeluaran)
4. Manajemen Konten (artikel, berita, pengumuman)
5. Jadwal Kegiatan (kajian, shalat berjamaah, dll.)
6. Reservasi Fasilitas Masjid (ruangan, aula, dll.)
7. Halaman Tamu/Publik untuk melihat informasi tanpa login
   
## Daftar Isi

1.  [Teknologi dan Bahasa Pemograman](#tentang-proyek)
2.  [Persyaratan Sistem](#persyaratan-sistem)
3.  [Panduan Instalasi & Menjalankan Proyek](#panduan-instalasi--menjalankan-proyek)
    * [1. Persiapan Umum](#1-persiapan-umum)
    * [2. Backend Laravel Setup](#2-backend-laravel-setup)
    * [3. Frontend React Setup](#3-frontend-react-setup)
4.  [Koneksi Database](#koneksi-database)
5.  [Kontak](#kontak)

---

## Tentang Proyek

1. Frontend (Antarmuka Pengguna)
  - Framework: Next.js (React)
  - Bahasa: JavaScript / TypeScript
  - Tools: Tailwind CSS, React Hook Form, Axios, Framer Motion (opsional)
2. Backend (Logika dan API)
  - Framework: Express.js
  - Bahasa: JavaScript / TypeScript
  - Tools: Multer (untuk upload gambar), JWT (untuk autentikasi)
3. Database
  - DBMS: PostgreSQL
  - ORM: Sequelize
4. Environment
  - Local Dev: Node.js
  - 

---

## Persyaratan Sistem

Pastikan sistem Anda memenuhi persyaratan berikut sebelum instalasi:

* **Node.js**: Versi 22.14 
* **npm** : 10.7.0
* **Database**: PostgreSQL

---

## Panduan Instalasi & Menjalankan Proyek

Ikuti langkah-langkah di bawah ini untuk mengatur dan menjalankan proyek di lingkungan lokal Anda.

### 1. Persiapan Umum

1.  **Clone Repositori**:
    Kloning repositori proyek ini ke komputer lokal Anda. Jika Anda mendapatkan ini dalam bentuk arsip zip, ekstrak di lokasi pilihan Anda. Struktur proyek seharusnya terlihat seperti ini:
    ```
    .
    ├── SIM-backend/            # Folder backend Express
    └── SIM-frontend/           # Folder frontend Next
    ```

2.  **Buat Database**:
    Buat database baru di sistem manajemen database Anda (PostgreSQL). Beri nama database sesuai keinginan Anda (misalnya, `sima_db`).

### 2. Backend Express Setup

1.  **Navigasi ke Folder Backend**:
    Buka terminal atau command prompt dan masuk ke folder `Backend`:
    ```bash
    cd SIM-backend
    ```

2.  **Konfigurasi Environment**:
    Salin file `.env.example` menjadi `.env`:
    ```bash
    cp .env.example .env
    ```
    Buka file `.env` yang baru dibuat dan perbarui detail koneksi database sesuai dengan pengaturan Anda:
    ```dotenv
    PORT=8080

    <br>DB_HOST=localhost
    <br>DB_USERNAME=your_postgres_user
    <br>DB_PASSWORD=your_postgres_password
    <br>DB_DATABASE=your_database_name
    <br>Db_PORT=5432
    
    <br>JWT_SECRET=your_jwt_secret_key
    <br>JWT_EXPIRATION=86400
    
    <br>EMAIL_USER=your_email@example.com
    <br>EMAIL_PASS=your_email_app_password
    <br>FRONTEND_URL=http://localhost:3000
    ```

3.  **Install Dependencies npm**:
    ```bash
    npm install
    ```

4.  **migration dan seeding**:
    ```bash
    npm run db:reset
    ```

5.  **Jalankan Server Express**:
    ```bash
    npm run dev
    ```
    Pastikan Backend API berjalan di `http://localhost:8080`. Biarkan terminal ini tetap terbuka.

### 3. Frontend React Setup

1.  **Navigasi ke Folder Frontend**:
    Buka terminal baru dan masuk ke folder `sim-frontend`:
    ```bash
    cd SIM-frontend      # Atau navigasi ke folder ini jika Anda membuatnya di tempat lain
    ```

2.  **Install Dependencies npm**:
    ```bash
    npm install
    ```

3.  **Jalankan Server Pengembangan React**:
    ```bash
    npm run dev
    ```
    Frontend React akan berjalan di `http://localhost:3000` (atau port lain yang ditunjukkan oleh Vite). Buka URL ini di browser web Anda.

---


## Project Architecture <br>
![alt text](/pictures/diagram.png)

## .env example <br>
PORT=3000

<br>DB_HOST=localhost
<br>DB_USERNAME=your_postgres_user
<br>DB_PASSWORD=your_postgres_password
<br>DB_DATABASE=your_database_name
<br>Db_PORT=5432

<br>JWT_SECRET=your_jwt_secret_key
<br>JWT_EXPIRATION=86400

<br>EMAIL_USER=your_email@example.com
<br>EMAIL_PASS=your_email_app_password
<br>FRONTEND_URL=http://localhost:3000
