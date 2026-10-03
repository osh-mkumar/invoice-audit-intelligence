import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Attempt to read from output/audit_results.json relative to workspace
    const primaryPath = path.resolve(process.cwd(), '../output/audit_results.json');
    const fallbackPath = path.resolve(process.cwd(), 'public/audit_results.json');

    let filePath = primaryPath;
    if (!fs.existsSync(primaryPath)) {
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      } else {
        return NextResponse.json(
          { error: 'audit_results.json not found in output/ directory' },
          { status: 440 }
        );
      }
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
