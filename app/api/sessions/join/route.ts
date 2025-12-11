import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;

    const { session_code, user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    if (!session_code) {
      return NextResponse.json({ error: 'Session code is required' }, { status: 400 });
    }

    // Find session by code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_code', session_code.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'ended') {
      return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('session_members')
      .select('*')
      .eq('session_id', session.id)
      .eq('user_id', user_id)
      .single();

    if (existingMember) {
      return NextResponse.json({ session, member: existingMember });
    }

    // Check member limit
    const { count } = await supabase
      .from('session_members')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    if (count && count >= session.max_players) {
      return NextResponse.json({ error: 'Session is full' }, { status: 400 });
    }

    // Add user as member
    const { data: member, error: memberError } = await supabase
      .from('session_members')
      .insert({
        session_id: session.id,
        user_id: user_id,
        is_ready: false,
      })
      .select()
      .single();

    if (memberError) throw memberError;

    return NextResponse.json({ session, member });
  } catch (error: any) {

    return NextResponse.json({ error: error.message || 'Failed to join session' }, { status: 500 });
  }
}
