# COIN RUSH ISLAND

> **Jelajahi Pulau, Kumpulkan Harta!**

COIN RUSH ISLAND adalah game petualangan eksplorasi 3D bertema pulau tropis dengan gaya low-poly estetik, modern, dan menyenangkan dimainkan langsung di peramban (browser) laptop maupun perangkat seluler (mobile).

Game ini dibangun menggunakan teknologi web murni: **Vite**, **JavaScript (ES Modules)**, **Three.js**, **HTML5**, **CSS3**, dan **Web Audio API**, dilengkapi dengan **Server-Authoritative Real-Time Online Multiplayer** berbasis WebSocket (`ws`).

---

## 🎮 Kontrol Permainan

### Komputer & Laptop (Desktop)
| Tombol | Aksi | Keterangan |
| :--- | :--- | :--- |
| **W / A / S / D** atau **Panah** | Bergerak | Akselerasi dan deselerasi halus relatif terhadap kamera |
| **SPASI (Spacebar)** | Melompat | Melompat dengan fisika gravitasi; dapat digunakan untuk menghindari serangan buaya |
| **E** | Interaksi | Membuka peti kayu dan peti emas (membutuhkan kunci) |
| **ESC** | Menu / Pause | Kembali ke navigasi menu |

### Perangkat Seluler (Mobile / Tablet)
- **Virtual D-Pad**: Geser atau tekan tombol arah (Atas, Bawah, Kiri, Kanan) untuk menggerakkan petualang.
- **Tombol LOMPAT**: Melompat ke udara dengan pencegahan double-jump di udara.
- **Tombol BUKA (Interaksi)**: Tombol aksi kontekstual yang muncul secara otomatis saat mendekati peti harta karun.

---

## 🏝️ Fitur & Mekanik Gameplay

### 1. Durasi Ronde & Aturan Waktu
- Durasi resmi ronde: **120 detik** (2 menit).
- Timer hanya berjalan saat permainan aktif dan berhenti otomatis di layar menu atau hasil ronde.
- Peringatan visual berkedip saat sisa waktu $\le 10$ detik.
- Reset bersih saat tombol *Main Lagi* (Retry) ditekan: timer kembali ke 120 detik tanpa timer ganda.

### 2. Mekanik Lompat Terintegrasi
- Fisika vertikal dengan gravitasi realistis dan durasi melayang di udara sekitar 0,6–0,8 detik.
- **Lockout Pencegahan Double-Jump**: Karakter tidak dapat melompat berulang kali saat masih berada di udara.
- **Dodge Serangan Buaya**: Melompat saat buaya menyerang memberikan bonus **+20 Poin** (*Lompat Menghindar!*).
- **Damage Air Tetap Berlaku**: Melompat di atas air sungai berbahaya tidak membuat pemain kebal terhadap damage air.

### 3. Kontur Tanah Pulau & Landmark Khusus
- Permukaan pulau bervariasi dengan elevasi halus: bukit timur (+2.2m), dataran tinggi barat (+1.8m), lereng landai, dan pantai landai (+0.0m).
- 4 Landmark utama yang dapat dikenali dan tercermin pada minimap:
  1. **Pohon Raksasa Kuno (Ancient Grand Tree)** di bukit barat daya.
  2. **Monolit Mistik (Mystic Monoliths)** formasi batu kuno di barat laut.
  3. **Altar Emas (Golden Altar)** di puncak bukit timur.
  4. **Gua Rahasia (Secret Grotto)** formasi batu tersembunyi (+30 poin penemuan).

### 4. Sistem Bahaya Sungai, Jembatan Kayu & Efek Air
- **Bahaya Sungai**: Menginjakkan kaki di air sungai menyebabkan damage sebesar **10 HP per detik** dan hambatan gerak (wading resistance).
- **Jembatan Kayu Aman**: 2 jembatan kayu kokoh dengan tiang dan papan melintasi sungai. Karakter aman dari damage air (0 damage) saat berada di atas permukaan jembatan.
- **Efek Air Hidup**: Gelombang multi-lapisan prosedural, riak air (ripples), dan efek percikan air (water splash) dinamis saat karakter atau buaya bergerak di sungai.

### 5. AI Buaya Cerdas (State Machine 4-Tahap)
3 ekor buaya 3D low-poly dengan animasi rahang, ekor, dan tungkai berpatroli di sungai:
- **PATROL**: Bergerak perlahan di jalur sungai patrolinya.
- **CHASE**: Berbalik dan mengejar petualang saat terdeteksi dalam radius bahaya dengan akselerasi bertahap.
- **ATTACK**: Menerjang dan menggigit dengan damage **25 HP** serta cooldown serangan 1.2 detik (mencegah damage spam).
- **RETURN**: Kembali ke jalur patroli sungai saat pemain berhasil melarikan diri lebih dari 16 meter.

### 6. Potion Kesehatan & Manajemen Health
- Health maksimal: **100 HP**.
- 3 Potion kesehatan berwarna hijau melayang dan berputar di daratan valid.
- Setiap potion memulihkan **+30 HP** (dibatasi maksimum 100 HP). Sekali pakai per ronde.

### 7. Hadiah, Kunci Emas & Peti Terkunci
- **40 Koin Biasa**: 10 poin per koin.
- **5 Peti Kayu**: 50 poin per peti.
- **1 Peti Emas Terkunci**: 100 poin, membutuhkan **Kunci Emas** yang tersembunyi di pulau.
- Sistem spawn deterministik terdistribusi merata dan menghindari sungai maupun rintangan padat.

### 8. Combo Koin Beruntun & Misi Sampingan
- **Combo Koin**:
  - 5 koin berturut-turut (interval $< 3.5$ detik): **Bonus +20 Poin**.
  - 10 koin berturut-turut: **Mega Bonus +50 Poin**.
- **3 Misi Sampingan per Ronde**:
  - *Kolektor Koin*: Kumpulkan 20 koin (+30 poin).
  - *Penjelajah Gua*: Temukan Gua Rahasia (+40 poin).
  - *Harta Karun Kuno*: Buka Peti Emas dengan Kunci Emas (+50 poin).

### 9. Pencapaian Koleksi Sempurna & Rekor Pribadi
- **Koleksi Sempurna**: Mengumpulkan seluruh 40 koin biasa dalam satu ronde memberikan penghargaan khusus dan **Bonus +100 Poin**.
- **Rekor Pribadi**: Skor tertinggi disimpan secara otomatis dan persisten di `localStorage` peramban.

### 10. Minimap Radar 2D Akurat
- Radar minimap berbasis Canvas 2D di sudut layar yang mencerminkan koordinat 3D pulau secara nyata.
- Menampilkan posisi dan arah hadap pemain, sungai, jembatan, landmark, koin, peti, dan buaya.

### 11. Antarmuka 100% Bahasa Indonesia & Desain Bersih
- Seluruh teks yang terlihat oleh pemain menggunakan bahasa Indonesia alami (Mulai, Pengaturan, Cara Bermain, Kesehatan, Skor, Sisa Waktu, Main Lagi, dll.).
- **Bebas Emoji**: Seluruh ikon antarmuka menggunakan vektor SVG inline yang tajam dan konsisten.

---

## 🌐 Mode Multiplayer Online (Real-Time WebSocket)

Game dilengkapi dengan sistem **True Online Multiplayer** server-authoritative yang sesungguhnya:
- **Server WebSocket Mandiri**: Berjalan pada Node.js (`server/multiplayer.js`) di port 3001.
- **Sistem Room**: Buat room baru (menghasilkan kode room 5-karakter unik) atau gabung menggunakan kode room teman.
- **Lobby Roster Real-Time**: Daftar pemain yang terhubung diperbarui secara instan dengan indikator warna kaos petualang.
- **Shared Deterministic Seed**: Semua pemain dalam satu room menerima seed ronde yang sama dari server, memastikan 40 koin dan 6 peti muncul di lokasi yang persis sama.
- **Sinkronisasi Posisi 20Hz**: Posisi, rotasi, gerakan, dan lompatan pemain disinkronkan secara langsung dengan interpolasi halus, avatar 3D kustom, dan nametag terapung.
- **Validasi Server-Authoritative**: Pengumpulan koin dan pembukaan peti divalidasi oleh server. Hadiah yang diambil oleh Pemain A langsung lenyap di layar Pemain B dan poin hanya diberikan kepada pengambil pertama.
- **Klasemen Kompetitif**: Hasil akhir menampilkan tabel peringkat seluruh pemain dengan aturan tie-breaker (*Skor $\rightarrow$ Koin $\rightarrow$ Health*).

---

## 🚀 Panduan Menjalankan Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
- npm (terpasang bersama Node.js).

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server Multiplayer (Wajib untuk mode multiplayer)
```bash
npm run server
```
Server WebSocket akan aktif mendengarkan koneksi di `http://127.0.0.1:3001`.

### 3. Menjalankan Game (Frontend)
Buka terminal baru di direktori proyek dan jalankan:
```bash
npm run dev
```
Buka browser pada alamat `http://localhost:3000` (atau port yang ditampilkan oleh Vite).

### 4. Build untuk Produksi
```bash
npm run build
```
Hasil build teroptimasi akan disimpan di direktori `dist/`.

Uji coba hasil build produksi:
```bash
npm run preview
```

---

## 🧪 Pengujian Otomatis (Automated Tests)

Proyek ini dilengkapi dengan 94 pengujian otomatis end-to-end berbasis Chrome Headless CDP:
- **Pengujian Inti Gameplay (68 tes)**: Memvalidasi menu, lompatan, ketinggian elevasi tanah, minimap, AI buaya, damage sungai, safe bridge, potion, peti emas terkunci, misi, combo, pencapaian koleksi sempurna, dan penyimpanan skor lokal.
- **Pengujian Multiplayer (26 tes)**: Memvalidasi koneksi 2 client bersamaan, pembuatan room, bergabung room, sinkronisasi seed, avatar 3D remote, sinkronisasi posisi 20Hz, validasi anti-duplikasi koin & peti, klasemen peringkat, dan nihil console error.

Jalankan pengujian:
```bash
node scratch/test_gameplay.mjs
node scratch/test_multiplayer.mjs
```

---

## ☁️ Panduan Deployment

### Frontend (Game Client)
Frontend berupa aplikasi web statis modern hasil build Vite yang dapat di-deploy ke:
- **Vercel**: Import repository GitHub, pilih framework Vite, lalu deploy.
- **Netlify**: Sambungkan repository atau drag-and-drop folder `dist/`.
- **GitHub Pages**: Build dengan `npm run build` dan publish direktori `dist/`.

### Backend Multiplayer
Server WebSocket (`server/multiplayer.js`) dapat di-deploy ke platform dengan dukungan WebSocket:
- **Render / Railway / Fly.io / VPS**:
  - Command start: `node server/multiplayer.js`
  - Port environment variable: `MULTIPLAYER_PORT` (default: 3001).
  - Pada client di lingkungan produksi, arahkan URL WebSocket ke domain server Anda (misal `wss://api.namadomain.com`).

---

## 🏗️ Struktur Proyek

```
Coin Rush Island/
├── index.html            # Markup game, HUD, canvas minimap, modal menu & lobby multiplayer
├── package.json          # Konfigurasi dependensi (Three.js, Vite, ws) dan scripts
├── vite.config.js        # Konfigurasi bundler Vite
├── README.md             # Dokumentasi lengkap proyek
├── server/
│   └── multiplayer.js    # Server-authoritative WebSocket server untuk room & pertandingan online
└── src/
    ├── main.js           # Engine game utama, loop animasi, input, kamera, HUD, dan state
    ├── world.js          # Geometri pulau, kontur tanah, sungai, jembatan, dan landmark
    ├── character.js      # Model petualang low-poly 3D & animasi prosedural
    ├── crocodiles.js     # AI buaya 4-state (patrol, chase, attack, return) & rute sungai
    ├── collectibles.js   # Koin emas, peti harta, potion kesehatan, kunci & partikel
    ├── audio.js          # Generator efek suara & musik prosedural (Web Audio API)
    ├── minimap.js        # Radar minimap canvas 2D real-time
    ├── multiplayer.js    # Manajer koneksi client WebSocket, avatar remote & nametag
    └── style.css         # Styling antarmuka kaca gelap (glassmorphism), HUD, & tombol responsif
```

---

## 📄 Lisensi

Didistribusikan di bawah lisensi MIT.
