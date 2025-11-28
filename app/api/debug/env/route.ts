import { NextResponse } from 'next/server';

export async function GET() {
  const secret = process.env.ADMIN_WARMUP_SECRET;
  
  return NextResponse.json({
    hasSecret: !!secret,
    secretLength: secret?.length || 0,
    secretFirst4: secret?.substring(0, 4) || 'none',
    secretLast4: secret?.substring(secret.length - 4) || 'none',
    allAdminVars: Object.keys(process.env).filter(k => k.includes('ADMIN'))
  });
}
