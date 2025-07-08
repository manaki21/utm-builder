import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const bitlyToken = process.env.BITLY_TOKEN!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  // QR code creation logic
  if (body.create_qr && body.bitly_url) {
    const bitlink = body.bitly_url.replace(/^https?:\/\//, '');
    // Fetch QR code from Bitly
    const qrRes = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${bitlink}/qr`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bitlyToken}`,
        'Accept': 'image/png',
      },
    });
    if (!qrRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch QR code from Bitly' }, { status: 500 });
    }
    // Convert to base64 data URL (for demo; in production, store in S3 or similar)
    const buffer = Buffer.from(await qrRes.arrayBuffer());
    const qr_code_url = `data:image/png;base64,${buffer.toString('base64')}`;
    // Store in Supabase
    const { error: updateError } = await supabase
      .from('utm_shortlinks')
      .update({ qr_code_url })
      .eq('bitly_url', body.bitly_url);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ qr_code_url });
  }

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