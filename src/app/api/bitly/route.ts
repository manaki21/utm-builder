import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const bitlyToken = process.env.BITLY_TOKEN!;

export async function POST(req: NextRequest) {
  const { utm_url } = await req.json();
  if (!utm_url) return NextResponse.json({ error: 'Missing utm_url' }, { status: 400 });

  // Check for existing shortlink
  const { data: existing, error: selectError } = await supabase
    .from('utm_shortlinks')
    .select('*')
    .eq('utm_url', utm_url)
    .maybeSingle();
  if (selectError) return NextResponse.json({ error: selectError.message }, { status: 500 });
  if (existing && existing.bitly_url) {
    return NextResponse.json({ bitly_url: existing.bitly_url, duplicate: true });
  }

  // Create Bitly shortlink
  const bitlyRes = await fetch('https://api-ssl.bitly.com/v4/shorten', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bitlyToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ long_url: utm_url })
  });
  if (!bitlyRes.ok) {
    const err = await bitlyRes.json();
    return NextResponse.json({ error: err.message || 'Bitly error' }, { status: 500 });
  }
  const bitlyData = await bitlyRes.json();
  const bitly_url = bitlyData.link;

  // Store in Supabase
  const { error: insertError } = await supabase
    .from('utm_shortlinks')
    .insert([{ utm_url, bitly_url }]);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ bitly_url, duplicate: false });
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('all')) {
    const { data, error } = await supabase
      .from('utm_shortlinks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: 'Not implemented' }, { status: 400 });
} 