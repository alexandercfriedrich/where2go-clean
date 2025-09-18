import { NextRequest, NextResponse } from 'next/server';
import { fetchWienAtEvents } from '@/lib/sources/wienAt';

export const runtime = 'nodejs';

type Body = {
  from?: string;        // YYYY-MM-DD
  to?: string;          // YYYY-MM-DD
  extraQuery?: string;  // z.B. "Bezirk1=05&KAT1=Ausstellung&WORT1=Festwochen"
  baseUrl?: string;     // optional, default AdvPrSrv.asp
  limit?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body: Body = await request.json().catch(() => ({}));
    const nowISO = new Date().toISOString().split('T')[0];
    const fromISO = body.from || nowISO;
    const toISO = body.to || fromISO;

    const events = await fetchWienAtEvents({
      baseUrl: body.baseUrl,
      fromISO,
      toISO,
      extraQuery: body.extraQuery,
      limit: body.limit ?? 500
    });

    return NextResponse.json({
      source: 'wien.at',
      count: events.length,
      paramsUsed: { fromISO, toISO, extraQuery: body.extraQuery },
      events
    });
  } catch (err: any) {
    console.error('Wien source error:', err);
    return NextResponse.json({ error: err.message || 'Unbekannter Fehler' }, { status: 500 });
  }
}