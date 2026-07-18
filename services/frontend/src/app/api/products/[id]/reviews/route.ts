import { NextRequest, NextResponse } from 'next/server';
import { odooClient } from '../../../../../lib/odooClient';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = req.cookies.get('med_session')?.value;
    const productId = params.id;
    const result = await odooClient.getProductReviews(productId, sessionId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[products reviews GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
