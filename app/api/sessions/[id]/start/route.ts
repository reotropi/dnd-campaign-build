import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { started_by } = await request.json();

    if (!started_by) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    // Verify user is host
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', params.id)
      .single();

    if (sessionError) throw sessionError;

    if (session.host_id !== started_by) {
      return NextResponse.json({ error: 'Only the host can start the session' }, { status: 403 });
    }

    // Update session status
    const { data, error } = await supabase
      .from('sessions')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Send initial DM message
    await supabase.from('messages').insert({
      session_id: params.id,
      user_id: null,
      character_id: null,
      message_type: 'dm',
      content: 'Welcome, brave adventurers! Your journey begins now. What do you do?',
    });

    return NextResponse.json({ session: data });
  } catch (error: any) {
    console.error('Error starting session:', error);
    return NextResponse.json({ error: error.message || 'Failed to start session' }, { status: 500 });
  }
}
