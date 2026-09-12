# Kitty ke Pulau Pinang 🐾

Website perancangan trip untuk group Kitty (Che Hasmawie, Firhan Anaqi, Amalin Safiyya, Damia Natasha, Damia Qistina).

## Ciri-ciri
- Kalendar akademik ikut universiti (IPG, UUM, UKM, USM)
- Undian tarikh perjalanan — tarikh dengan undian terbanyak automatik ditanda "MENANG"
- Wishlist tempat, klik kad untuk lihat siapa cadang & makanan apa

## Struktur fail
```
kitty-penang-trip/
├── index.html
├── style.css
├── app.js
├── firebase-config.js   <- anda perlu isi config Firebase sendiri (lihat bawah)
└── README.md
```

## Setup — Firebase (percuma, untuk data dikongsi semua orang)

1. Pergi ke https://console.firebase.google.com dan log masuk guna akaun Google.
2. Klik **Add project**, namakan projek (cth: `kitty-penang-trip`), ikut je langkah default, klik **Create project**.
3. Dalam dashboard projek, klik ikon **`</>`** (Web app) untuk daftar app web.
4. Namakan app (cth: `kitty-web`), klik **Register app**. Firebase akan bagi anda satu blok kod `firebaseConfig` — **copy** nilai tu.
5. Paste nilai tu ke dalam fail `firebase-config.js` (gantikan semua `"GANTI..."`).
6. Kat sidebar Firebase Console, pergi **Build > Firestore Database** > klik **Create database** > pilih **Start in test mode** (senang untuk group kecil, tak perlu login) > pilih lokasi server (`asia-southeast1` paling dekat) > **Enable**.

   > ⚠️ Test mode bermakna sesiapa dengan link boleh baca/tulis data. Untuk group 5 orang kawan-kawan, ni okay. Kalau nak lebih selamat nanti, boleh edit Firestore Rules untuk hadkan akses.

7. Buka `index.html` dalam browser (boleh guna extension **Live Server** dalam VS Code) — pastikan form submit berfungsi dan data muncul semula bila refresh. Kalau data tak keluar, semak **Console** (F12) untuk error.

## Setup — GitHub & Publish (GitHub Pages)

1. Buka VS Code, buka folder `kitty-penang-trip` ni.
2. Dalam terminal VS Code:
   ```
   git init
   git add .
   git commit -m "Initial commit: Kitty Penang trip planner"
   ```
3. Pergi https://github.com, klik **New repository**, namakan (cth: `kitty-penang-trip`), jangan tick "Add README" (kita dah ada), klik **Create repository**.
4. GitHub akan bagi arahan — copy baris macam ni dan run dalam terminal (gantikan URL dengan URL repo anda):
   ```
   git remote add origin https://github.com/USERNAME/kitty-penang-trip.git
   git branch -M main
   git push -u origin main
   ```
5. Dalam repo GitHub anda, pergi tab **Settings > Pages**.
6. Bawah **Build and deployment > Source**, pilih **Deploy from a branch**. Bawah **Branch**, pilih `main` dan folder `/ (root)`, klik **Save**.
7. Tunggu 1–2 minit, refresh page tu — link website anda akan muncul di atas (biasanya `https://USERNAME.github.io/kitty-penang-trip/`).
8. Share link tu dalam group Kitty — semua orang boleh submit tarikh, undi, dan tambah wishlist, dan semua akan nampak update yang sama sebab data disimpan dalam Firestore.

## Update lepas ni
Bila anda ubah code (`index.html`/`style.css`/`app.js`) dalam VS Code:
```
git add .
git commit -m "describe perubahan"
git push
```
GitHub Pages akan auto-update dalam masa seminit.
