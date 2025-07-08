import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const bitlyToken = process.env.BITLY_TOKEN!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { utm_url } = body;
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
  const { searchParams } = new URL(req.url);
  if (searchParams.get('analytics') === '1' && searchParams.get('bitlink')) {
    const bitlink = searchParams.get('bitlink');
    const bitlyToken = process.env.BITLY_TOKEN;
    if (!bitlyToken) {
      return NextResponse.json({ error: 'Bitly token not configured' }, { status: 500 });
    }
    try {
      const res = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${bitlink}/clicks/summary`, {
        headers: {
          'Authorization': `Bearer ${bitlyToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const err = await res.json();
        return NextResponse.json({ error: err.message || 'Failed to fetch analytics' }, { status: 500 });
      }
      const data = await res.json();
      return NextResponse.json({ total_clicks: data.total_clicks, ...data });
    } catch (e) {
      return NextResponse.json({ error: 'Error fetching analytics' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
} 