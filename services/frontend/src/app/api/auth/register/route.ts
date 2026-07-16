import { NextResponse } from 'next/server';
import { odooClient } from '../../../../lib/odooClient';

export async function POST(request: Request) {
  try {
    const { name, email, password, registration_number } = await request.json();

    if (!name || !email || !password || !registration_number) {
      return NextResponse.json(
        { error: 'All fields (Name, Email, Password, License) are required' },
        { status: 400 }
      );
    }

    const result = await odooClient.register(name, email, password, registration_number);

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
      });
    }

    return NextResponse.json(
      { error: result.error || 'Failed to register buyer profile' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Server error occurred during registration' },
      { status: 500 }
    );
  }
}
