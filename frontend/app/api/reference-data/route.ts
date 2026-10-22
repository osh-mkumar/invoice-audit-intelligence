import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET() {
  // Try proxying to Python backend first
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/reference-data`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });
    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // Backend offline, fallback to reading data/ files directly
  }

  try {
    const rootDir = path.resolve(process.cwd(), '..');
    const rateCardPath = path.join(rootDir, 'data', 'finance_rate_card.json');
    const gstPath = path.join(rootDir, 'data', 'finance_gst_reference.json');

    let rateCard = {};
    let gstRef = {};

    if (fs.existsSync(rateCardPath)) {
      rateCard = JSON.parse(fs.readFileSync(rateCardPath, 'utf-8'));
    }
    if (fs.existsSync(gstPath)) {
      gstRef = JSON.parse(fs.readFileSync(gstPath, 'utf-8'));
    }

    const vendors = Object.keys(rateCard).sort();

    return NextResponse.json({
      vendors,
      rate_cards: rateCard,
      gst_reference: gstRef,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load reference data', details: error.message },
      { status: 500 }
    );
  }
}
