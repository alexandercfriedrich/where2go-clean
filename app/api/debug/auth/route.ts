import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_WARMUP_SECRET;
  
  if (!adminSecret) {
    return NextResponse.json({
      error: 'ADMIN_WARMUP_SECRET not set',
      hasSecret: false
    });
  }
  
  if (!authHeader) {
    return NextResponse.json({
      error: 'No Authorization header',
      hasAuthHeader: false
    });
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({
      error: 'Authorization header does not start with "Bearer "',
      authHeaderStart: authHeader.substring(0, 20),
      hasBearer: false
    });
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  const tokenBuffer = Buffer.from(token, 'utf8');
  const secretBuffer = Buffer.from(adminSecret, 'utf8');
  
  let isValid = false;
  try {
    if (tokenBuffer.length === secretBuffer.length) {
      isValid = timingSafeEqual(tokenBuffer, secretBuffer);
    }
  } catch (e) {
    // ignore
  }
  
  return NextResponse.json({
    hasSecret: true,
    hasAuthHeader: true,
    hasBearer: true,
    tokenLength: token.length,
    secretLength: adminSecret.length,
    tokenFirst4: token.substring(0, 4),
    tokenLast4: token.substring(token.length - 4),
    secretFirst4: adminSecret.substring(0, 4),
    secretLast4: adminSecret.substring(adminSecret.length - 4),
    lengthMatch: tokenBuffer.length === secretBuffer.length,
    tokensMatch: isValid,
    // Show character differences if lengths match but content doesn't
    debug: tokenBuffer.length === secretBuffer.length && !isValid ? {
      tokenHex: tokenBuffer.toString('hex').substring(0, 40),
      secretHex: secretBuffer.toString('hex').substring(0, 40)
    } : undefined
  });
}
