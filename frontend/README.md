# Invoice Audit Intelligence — Frontend Workstation

This directory contains the Next.js + TypeScript + Tailwind CSS finance workstation for the Invoice Audit Intelligence platform.

For full project architecture and audit engine documentation, please refer to the main [Root README](../README.md).

---

## Audit Modes

1. **Demo Audit (Default)**:
   - Ingests the baseline demonstration dataset (508 invoices analyzed, 65 flagged invoices, 443 not flagged, ₹17,560,098.94 potential financial exposure).
   - *Demonstration dataset from the Mosaic Fellowship 2026 invoice auditing challenge.*
   - *Note: "Not flagged" indicates that no discrepancies were detected by the six implemented audit checks, rather than guaranteed commercial or legal correctness.*
2. **New Audit**:
   - **Manual Entry**: Interactive multi-line invoice builder with live calculated guidance.
   - **Upload Files**: Batch upload via JSON or CSV with automated parsing, schema validation, and synthetic template downloads.
   - **Custom References**: Add supplemental vendor rate cards and statutory GST references.
   - Dynamic metric calculation purely based on user submissions.

---

## Quick Start

### 1. Start Python FastAPI Backend (Port 8000)
```bash
# In project root
python -m uvicorn backend.main:app --reload --port 8000
```

### 2. Start Next.js Frontend (Port 3000)
```bash
# In frontend/ directory
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.
