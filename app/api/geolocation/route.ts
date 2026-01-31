import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

interface GeolocationData {
  city?: string;
  region?: string; // State/Province
  country?: string;
  postal?: string;
  ip?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get client IP from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || 'unknown';

    // For development/localhost, use a fallback
    if (clientIp === 'unknown' || clientIp === '::1' || clientIp.startsWith('127.') || clientIp.startsWith('192.168.')) {
      return NextResponse.json({
        city: 'Development',
        state: 'Local',
        country: 'US',
        postal_code: '00000',
      });
    }

    // Call ipapi.co (free tier, no API key needed)
    const response = await fetch(`https://ipapi.co/${clientIp}/json/`, {
      headers: {
        'User-Agent': 'Springford-Press-Analytics/1.0',
      },
    });

    if (!response.ok) {
      throw new Error('Geolocation API failed');
    }

    const data: GeolocationData = await response.json();

    return NextResponse.json({
      city: data.city || 'Unknown',
      state: data.region || 'Unknown',
      country: data.country || 'Unknown',
      postal_code: data.postal || '',
    });
  } catch (error) {
    console.error('Geolocation error:', error);
    
    // Return default values on error
    return NextResponse.json({
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
      postal_code: '',
    });
  }
}
