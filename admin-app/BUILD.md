Flism Admin APK — Build Instructions
Prerequisites
Node.js 18+
EAS CLI: npm install -g eas-cli
Expo account at expo.dev
Logged in: eas login
One-time setup
cd admin-app
npm install
eas build:configure   # only needed once; press Enter to accept defaults

Build the Admin APK
cd admin-app
eas build --platform android --profile preview

This builds a .apk file you can download and install directly on any Android phone
The APK connects to: https://flism-app.onrender.com
Bundle ID: com.flism.admin
Only users with role='admin' in the database can sign in
Build the Student APK (from mobile/)
cd mobile
eas build --platform android --profile preview

Bundle ID: com.flism.app
Admin Login
Default admin credentials:

Email: admin@flism.com
Password: Admin@Flism2024
What the Admin App includes
Dashboard: live stats (users, loans, disbursed, repaid)
Loans: approve/reject pending loan applications
Assets: verify/reject submitted collateral
Users: search all students, manually verify KYC
Broadcast: send notifications to all students
Activity feed: real-time notifications
Project Structure
admin-app/
├── app/
│   ├── (auth)/index.tsx    # Login screen
│   ├── _layout.tsx         # Root layout + auth guard
│   ├── dashboard.tsx       # Main dashboard
│   ├── loans.tsx           # Loan management
│   ├── users.tsx           # User management
│   ├── assets.tsx          # Asset management
│   └── broadcast.tsx       # Send notifications
├── contexts/AuthContext.tsx # JWT auth (admin-only)
├── lib/api.ts              # API fetch wrapper
├── app.json                # Bundle ID: com.flism.admin
└── eas.json                # Build config