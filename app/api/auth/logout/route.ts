import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: 'token',
    value: '',
    path: '/',
    httpOnly: true,
    expires: new Date(0),
  });

  return response;
}
