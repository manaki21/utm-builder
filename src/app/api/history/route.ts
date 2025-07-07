import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const { data, error } = await supabase
    .from('utm_history')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { id, url, source, medium, campaign, timestamp, term, content } = data;
  if (!url || !timestamp) {
    return NextResponse.json({ error: 'Missing url or timestamp' }, { status: 400 });
  }
  const { error } = await supabase
    .from('utm_history')
    .insert([{ id, url, source, medium, campaign, timestamp, term, content }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabase
    .from('utm_history')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 