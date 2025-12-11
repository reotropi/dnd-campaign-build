import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase.from('characters').select('*').eq('id', params.id).single();

    if (error) throw error;

    return NextResponse.json({ character: data });
  } catch (error: any) {

    return NextResponse.json({ error: error.message || 'Failed to fetch character' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { updated_by, ...updates } = await request.json();

    if (!updated_by) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ character: data });
  } catch (error: any) {

    return NextResponse.json({ error: error.message || 'Failed to update character' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = supabaseAdmin;

    const { searchParams } = new URL(request.url);
    const deleted_by = searchParams.get('deleted_by');

    if (!deleted_by) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 });
    }

    const { error } = await supabase.from('characters').delete().eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {

    return NextResponse.json({ error: error.message || 'Failed to delete character' }, { status: 500 });
  }
}
