import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;

/** Accepts a PDF or TXT resume upload and returns its plain text. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a PDF or text file.' }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'File must be smaller than 8 MB.' }, { status: 413 });

    const name = file.name.toLowerCase();
    const isText = name.endsWith('.txt') || file.type === 'text/plain';
    const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';

    if (isText) return NextResponse.json({ text: await file.text() });
    if (!isPdf) return NextResponse.json({ error: 'Supported formats are PDF and TXT.' }, { status: 400 });

    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(Buffer.from(await file.arrayBuffer()));
    if (!parsed.text.trim()) {
      return NextResponse.json(
        { error: 'No selectable text found. If this is a scanned PDF, convert it to text first.' },
        { status: 422 },
      );
    }
    return NextResponse.json({ text: parsed.text.slice(0, MAX_TEXT_CHARS) });
  } catch (e) {
    return errorResponse(e, 'Could not parse file.');
  }
}
