# Kitty Goes to Penang 🐾

Trip planning website for group Kitty (Che Hasmawie, Firhan Anaqi, Amalin Safiyya, Damia Natasha, Damia Qistina).

## Features
- Academic calendar by university (IPG, UUM, UKM, USM), with optional image/PDF attachments
- Travel date voting — the date with the most votes is automatically marked "WINNING"
- Places wishlist — click a card to see who suggested it and what food to try
- Payment tracker — track trip costs and who has paid
- Tentative itinerary — day-by-day schedule with Morning/Afternoon/Evening/Night slots and theme suggestions
- Trip Core photo gallery — upload and view trip photos
- Everyone can delete their own entries

## File structure
```
kitty-penang-trip/
├── index.html
├── style.css
├── app.js
├── firebase-config.js   <- you need to fill in your own Firebase config (see below)
└── README.md
```

## Setup — Firebase (free, for data shared across everyone)

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Add project**, name the project (e.g. `kitty-penang-trip`), follow the default steps, click **Create project**.
3. In the project dashboard, click the **`</>`** icon (Web app) to register a web app.
4. Name the app (e.g. `kitty-web`), click **Register app**. Firebase will give you a `firebaseConfig` code block — **copy** those values.
5. Paste those values into the `firebase-config.js` file (replacing all the `"REPLACE..."` placeholders).
6. In the Firebase Console sidebar, go to **Build > Firestore Database** > click **Create database** > choose **Start in test mode** (easy for a small group, no login needed) > pick a server location (`asia-southeast1` is closest) > **Enable**.

   > ⚠️ Test mode means anyone with the link can read/write data. For a group of 5 friends, this is fine. If you want more security later, you can edit the Firestore Rules to restrict access.

7. Open `index.html` in a browser (you can use the **Live Server** extension in VS Code) — check that forms submit properly and data reappears after refreshing. If data doesn't show up, check the browser **Console** (F12) for errors.

## Setup — GitHub & Publish (GitHub Pages)

1. Open VS Code, open the `kitty-penang-trip` folder.
2. In the VS Code terminal:
   ```
   git init
   git add .
   git commit -m "Initial commit: Kitty Penang trip planner"
   ```
3. Go to https://github.com, click **New repository**, name it (e.g. `kitty-penang-trip`), don't tick "Add README" (we already have one), click **Create repository**.
4. GitHub will show you some commands — copy lines like these and run them in the terminal (replace the URL with your own repo's URL):
   ```
   git remote add origin https://github.com/USERNAME/kitty-penang-trip.git
   git branch -M main
   git push -u origin main
   ```
5. In your GitHub repo, go to the **Settings > Pages** tab.
6. Under **Build and deployment > Source**, choose **Deploy from a branch**. Under **Branch**, select `main` and folder `/ (root)`, then click **Save**.
7. Wait 1–2 minutes, refresh the page — your website link will appear above it (usually `https://USERNAME.github.io/kitty-penang-trip/`).
8. Share that link in the Kitty group chat — everyone can submit dates, vote, and add to the wishlist, and everyone will see the same updates since the data is stored in Firestore.

## Updating later
Whenever you change the code (`index.html`/`style.css`/`app.js`) in VS Code:
```
git add .
git commit -m "describe your changes"
git push
```
GitHub Pages will auto-update within about a minute.
