import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { session_id, content } = await request.json();

    if (!session_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id and content' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for DM messages
    const { data, error } = await supabaseAdmin.from('messages').insert({
      session_id,
      user_id: null, // DM messages have no user
      character_id: null,
      message_type: 'dm',
      content,
      roll_data: null,
    }).select().single();

    if (error) {
      console.error('Error inserting DM message:', error);
      throw error;
    }

    return NextResponse.json({ message: data });
  } catch (error: any) {
    console.error('Error in DM message route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send DM message' },
      { status: 500 }
    );
  }
}
