import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { is_ready, user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    // Update the session member's ready status
    const { error: updateError } = await supabase
      .from('session_members')
      .update({ is_ready })
      .eq('session_id', params.id)
      .eq('user_id', user_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating ready status:', error);
    return NextResponse.json({ error: error.message || 'Failed to update ready status' }, { status: 500 });
  }
}
