# 💰 Kharcha – Daily Expense Tracker

React + Tailwind PWA. Data is saved on your phone and synced to your own Google Drive (hidden `appDataFolder`). No backend server.

**Live app:** https://rj0011.github.io/kharcha/

- Live balance meter (salary vs spending), safe-to-spend per day
- Quick add (Paytm default), categories with budgets
- History with filters & search; Daily / Weekly / Monthly / Yearly reports
- Google Drive sync, offline support, dark mode, CSV export, JSON backup

Setup: Google Cloud OAuth Web Client ID → authorized JS origin `https://rj0011.github.io` → paste Client ID in app (More → Google Drive sync) or set repo variable `GOOGLE_CLIENT_ID`.

Dev: `npm install && npm run dev`
