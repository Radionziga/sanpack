import { NextResponse } from 'next/server';
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  getCustomerSession,
} from '@/lib/auth/customerSession';

export async function GET() {
  const customer = await getCustomerSession();
  return NextResponse.json({
    authenticated: Boolean(customer),
    customer: customer ? {
      name: customer.name,
      username: customer.username || '',
      picture: customer.picture || '',
      phone: customer.phone || '',
    } : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}

