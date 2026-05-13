# Flism — Student Fintech App (Ghana)

## Project Overview

Flism is a collateral-based student microloan platform built for university students in Ghana. Students submit physical assets (smartphones, laptops, etc.) as collateral and receive fast microloans with trust-score-based interest rates.

## Architecture

```
/
├── mobile/          # Expo React Native app (web preview on port 3000)
│   ├── app/
│   │   ├── (auth)/  # Welcome, Login, Register screens
│   │   ├── (tabs)/  # Home, Loans, Assets, Trust, Profile tabs
│   │   ├── loan/    # Request loan, Loan detail screens
│   │   ├── asset/   # Submit asset, Asset detail screens
│   │   ├── notifications.tsx
│   │   └── repayments.tsx
│   ├── contexts/    # AuthContext (JWT)
│   ├── lib/api.ts   # Fetch wrapper (relative URLs → Express proxy)
│   └── constants/   # Colors, theme
│
├── server/          # Express.js API (port 5000)
│   ├── routes/      # auth, users, loans, assets, trust, notifications
│   ├── middleware/  # JWT auth middleware
│   └── db.js        # PostgreSQL schema + pool
│
└── start.sh         # Starts Expo (port 3000) + Express proxy (port 5000)
```

## How It Works

- `start.sh` launches both services: Expo dev server (port 3000, internal) + Express server (port 5000, public)
- Express proxies `/` → Expo dev server for the frontend
- Express handles `/api/*` routes directly (no proxy)
- The frontend uses relative API URLs (e.g., `/api/loans`) which go through Express

## Key Features

1. **Auth**: JWT auth, Register/Login with student details
2. **Asset Vault**: Submit physical collateral (smartphone, laptop, etc.) with IMEI/serial
3. **Loan System**: Request loans up to your limit, multi-step flow with collateral selection
4. **Trust Score**: 0–500 bronze/silver/gold/platinum tiers, increases on repayment
5. **Repayments**: Track all active loan repayments with progress bars
6. **Notifications**: Real-time in-app notifications for all loan/asset events

## Design System

- **Primary**: #003EC7 / #0052FF (Flism Blue)
- **Font**: Plus Jakarta Sans (400, 500, 600, 700, 800)
- **Background**: #F5F7FF
- **Radius**: 12px default, 20px large

## Running Locally

The "Start application" workflow runs `bash start.sh` which handles everything automatically.

## Database

PostgreSQL on Replit with tables: `users`, `assets`, `loans`, `repayments`, `notifications`

## User Preferences

- React Native (Expo) mobile-first web app
- Ghanaian student context (universities: UG, KNUST, UCC, GIMPA, Ashesi)
- Currency: GHS (Ghanaian cedi)
- Loan range: GHS 50–5,000 depending on trust tier
- Collateral loan value: 55% of estimated asset value
