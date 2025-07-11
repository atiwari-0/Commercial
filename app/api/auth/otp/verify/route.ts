import { prisma } from '@/app/lib/prisma';
import { verifyOtp } from '@/app/utils/otp';
import { signJwt } from '@/app/lib/jwt';
import { setAuthCookie } from '@/app/lib/cookie';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, code, purpose } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return new Response('User not found', { status: 404 });

  const otp = await prisma.otp.findFirst({
    where: { userId: user.id, purpose },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp || otp.expiresAt < new Date()) return new Response('OTP expired', { status: 400 });

  const match = await verifyOtp(code, otp.codeHash);
  if (!match) return new Response('Wrong OTP', { status: 401 });

  if (!user.isVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    if (user.role === 'BUYER') {
      await prisma.buyerProfile.create({
        data: {
          userId: user.id,
          cart: { create: { items: {} } },
        },
      });
    } else {
      await prisma.sellerProfile.create({
        data: { userId: user.id, shopName: '', gstNumber: '' },
      });
    }
  }

  const token = signJwt({ id: user.id, role: user.role });
  const res = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });

  setAuthCookie(res,await token);
  return res;
}
