import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'Backend Connection Error',
        message:
          'Could not reach the Python FastAPI audit engine. Ensure the backend is running locally with: python -m uvicorn backend.main:app --reload --port 8000',
        details: err?.message || 'Connection refused',
      },
      { status: 503 }
    );
  }
}
