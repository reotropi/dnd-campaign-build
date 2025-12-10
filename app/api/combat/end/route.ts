import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * End combat for a session
 * This endpoint is called by Claude AI via the end_combat tool
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Clear combat state
    const { error: updateError } = await supabase
      .from('game_state')
      .update({ combat_state: null })
      .eq('session_id', session_id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Combat ended',
    });
  } catch (error: any) {
    console.error('Error ending combat:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end combat' },
      { status: 500 }
    );
  }
}
