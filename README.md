# Paperledger-AI

> **AI-powered financial document automation** — OCR, fraud detection, tax optimization, sustainability tracking, and smart exports in one dashboard.

![PaperLedger Dashboard](https://img.shields.io/badge/status-production--ready-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![Gemini](https://img.shields.io/badge/Gemini-2.5--flash-orange)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI OCR Upload** | Drag-and-drop invoices, receipts, or Excel files — Gemini AI extracts all financial fields automatically |
| 🛡️ **Fraud Detection** | Every document is scored for fraud risk and flagged with a reason |
| 🔄 **Subscription Auditor** | Detects recurring charges and shows upcoming payment dates |
| 🧮 **Tax Optimizer** | Per-document deductibility scores and AI tips to maximize business deductions |
| 🌿 **Sustainability Tracker** | Estimates CO₂ footprint of each expense |
| 📈 **Predictive Forecasting** | 6-month cash flow projections with an interactive scenario simulator |
| 💬 **AI Assistant** | Ask natural-language questions about your spending (powered by Gemini) |
| 📤 **Multi-format Export** | Excel, CSV, JSON, QuickBooks IIF — with custom field mapping |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript 5.8, Vite 6
- **Styling**: Tailwind CSS v4
- **AI**: Google Gemini 2.5 Flash (`@google/genai`)
- **Charts**: Recharts
- **Animations**: Motion (Framer Motion)
- **File Parsing**: SheetJS (`xlsx`)
- **Drag & Drop**: react-dropzone

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>=18`
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Install dependencies

```bash
cd "paperledger (1)"
npm install
```

### 2. Configure environment

Copy the example env file and add your API key:

```bash
copy .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="http://localhost:3000"
```

### 3. Run the dev server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 📁 Project Structure

```
paperledger/
├── src/
│   ├── App.tsx              # Main application (UI, state, all tabs)
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   ├── services/
│   │   └── gemini.ts        # Gemini AI integration (OCR + chat)
│   └── utils/
│       ├── export.ts        # Excel / CSV / JSON / QuickBooks export
│       └── cn.ts            # Tailwind class merge utility
├── .env                     # Your API key (not committed)
├── .env.example             # Template for env setup
├── vite.config.ts           # Vite + Tailwind config
├── tsconfig.json            # TypeScript config
└── package.json
```

---

## 📤 Supported File Types for Upload

| Type | Extension |
|------|-----------|
| Images (receipts, photos of invoices) | `.jpg`, `.jpeg`, `.png` |
| PDFs | `.pdf` |
| Spreadsheets | `.xlsx`, `.xls` |

---

## 📊 Tabs Overview

### Dashboard
- Stat cards: Total Spend, Pending Approval, Total Savings, Tax Recoverable
- Spending trends bar chart and category pie chart
- Smart budget tracking and vendor health scores
- Recent documents table

### Documents
- Full document list with AI confidence scores, fraud flags, and smart tags
- Search by vendor or category
- QuickBooks IIF export shortcut

### AI Assistant
- Chat bot powered by Gemini 2.5 Flash
- Ask anything about your uploaded documents
- Voice input support (Chrome/Edge)

### Sustainability
- Carbon footprint per document (estimated by AI)
- Carbon breakdown by category

### Tax Optimizer
- Deductibility score (0–100) per document
- AI-generated per-document tax tips
- Audit risk assessment

### Subscriptions
- Auto-detected recurring charges
- Monthly burn rate
- Upcoming billing dates

### Forecasting
- 6-month projected cash flow chart
- Scenario simulator (growth % / cost reduction %)

### Savings & Payments
- Tax recoverable summary
- Fraud avoidance savings
- Upcoming payment schedule

---

## 📤 Export Formats

| Format | Notes |
|--------|-------|
| **Excel** (`.xlsx`) | Line-item flattened view |
| **CSV** | Custom field mapping, RFC-4180 compliant |
| **JSON** | Full document data including line items |
| **QuickBooks IIF** | Ready to import into QuickBooks Desktop |
| **Copy CSV** | Clipboard copy with custom mapping |

All exports support **custom field mapping** — rename columns to match your accounting system's schema.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key |
| `APP_URL` | Optional | Base URL of the hosted app |
| `QUICKBOOKS_CLIENT_ID` | Optional | For future QuickBooks OAuth integration |
| `QUICKBOOKS_CLIENT_SECRET` | Optional | For future QuickBooks OAuth integration |

---

## 🔧 Available Scripts

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Build for production
npm run preview   # Preview the production build locally
npm run lint      # TypeScript type-check (tsc --noEmit)
```

---

## 🚢 Deployment (Vercel)

The project includes a `vercel.json` config for one-click Vercel deployment:

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add `GEMINI_API_KEY` as an environment variable in the Vercel dashboard
4. Deploy ✅

> ⚠️ **Important**: Never commit your `.env` file. It is already listed in `.gitignore`.

---

## 🔒 Security Notes

- API keys are injected at build time via `vite.config.ts` — they are **not** exposed in source code
- Fraudulent documents are flagged but **never auto-approved** — all decisions remain with the user
- No document data is stored server-side; all processing is done client-side or via stateless Gemini API calls

---

## 🐞 Known Limitations

- Voice input requires **Chrome or Edge** (uses `webkitSpeechRecognition`)
- The "DocHub" and "iHub" export buttons are **placeholders** (coming soon)
- Gemini API calls require an active internet connection
- Excel files with very large sheets (>10,000 rows) may be slow to process

---

## 📄 License

MIT © PaperLedger
