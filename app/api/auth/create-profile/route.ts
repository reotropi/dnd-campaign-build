import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, playerName, email } = await request.json();

    if (!userId || !playerName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Use service role to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        player_name: playerName,
        email: email,
        role: 'player', // Always set new users as 'player'
      })
      .select()
      .single();

    if (error) {
      // Check if profile already exists
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'Profile already exists' },
          { status: 200 }
        );
      }
      throw error;
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create profile' },
      { status: 500 }
    );
  }
}
