import { NextRequest, NextResponse } from 'next/server';
import { odooClient } from '../../../../lib/odooClient';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = req.cookies.get('med_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reviewId = parseInt(params.id, 10);
    const result = await odooClient.deleteReview(reviewId, sessionId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[reviews DELETE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
