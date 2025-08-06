import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Get the current user from Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create JWT for Zero
    const secret = process.env.ZERO_AUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const payload = {
      sub: session.user.id, // Zero requires this as userID
      userID: session.user.id, // Also include userID for permissions
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    };

    const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating Zero token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}