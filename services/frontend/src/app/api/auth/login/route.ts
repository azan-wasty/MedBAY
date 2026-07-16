import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient } from '../../../../lib/odooClient';

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await odooClient.login(login, password);

    if (result.success && result.session_id) {
      // result.session_id is now the REAL, post-rotation sid Odoo actually
      // persisted (parsed from its Set-Cookie header), not the stale
      // pre-rotation value from the JSON body. See odooClient.ts for the
      // full explanation.
      cookies().set('med_session', result.session_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      return NextResponse.json({
        success: true,
        user: result.user,
        session_id: result.session_id, // also return to store client-side if needed
      });
    }

    return NextResponse.json(
      { error: result.error || 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('[auth/login] failed:', error);
    return NextResponse.json(
      { error: error.message || 'Server error occurred during login' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  cookies().delete('med_session');
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}