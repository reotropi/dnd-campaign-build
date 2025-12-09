import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase.from('sessions').select('*').eq('id', params.id).single();

    if (error) throw error;

    return NextResponse.json({ session: data });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { updated_by, ...updates } = await request.json();

    if (!updated_by) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ session: data });
  } catch (error: any) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: error.message || 'Failed to update session' }, { status: 500 });
  }
}
