# Paperledger-AI
live website: https://paperledger-ai.vercel.app/
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

AI OCR Engine: Automatically extract data from receipts, invoices, and complex spreadsheets. Paperledger-AI utilizes Google Gemini 2.5 Flash with custom retry logic to ensure high accuracy and resilience in data extraction.
Intelligent Dashboard: See exactly where your money is going without the clutter. High-level stat cards and real-time category breakdowns provide instant insight into your financial health.
Fraud Intelligence: Protect your project with automated risk scoring. Every document is audited for suspicious vendors, mismatched totals, and duplicate charges, with AI-generated flags for immediate review.
Tax Optimizer: Maximize your write-offs with AI-generated deductibility scores. Get real-time tax optimization tips for every document while maintaining professional, audit-ready records.
Sustainability Matrix: Track your environmental impact with category-level CO2 analytics. The system automatically estimates the carbon footprint of your hardware and software spend.
Subscription Auditor: Never miss a payment with smart detection of recurring charges. Includes a deterministic forecasting engine to predict exactly when your next bill or renewal is due for any vendor.
Scenario Forecasting: Model your future with interactive growth and cost-reduction simulators. Deep dive into your spend with 6-month cash flow projections based on your historical patterns.
Professional Exports: Move your data seamlessly with support for Excel, CSV, and JSON. Includes a dedicated QuickBooks IIF generator to import your records directly into professional accounting software.
Conversational AI: Interact with your data using a natural-language Assistant. Ask instant questions about your total spend, top categories, or specific invoices without manually searching through tables.
Premium Aesthetics: A state-of-the-art dark mode interface built with Tailwind CSS v4. Features high-performance rendering, glassmorphism, and fluid animations for a world-class user experience.
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



## 🔧 Available Scripts

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Build for production
npm run preview   # Preview the production build locally
npm run lint      # TypeScript type-check (tsc --noEmit)
```

## 🔒 Security Notes

- API keys are injected at build time via `vite.config.ts` — they are **not** exposed in source code
- Fraudulent documents are flagged but **never auto-approved** — all decisions remain with the user
- No document data is stored server-side; all processing is done client-side or via stateless Gemini API calls
```

## 📄 License

MIT © PaperLedger
