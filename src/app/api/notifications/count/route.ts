import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const limited = rateLimit("read", `api:${user.id}`);
  if (!limited.ok)
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  return NextResponse.json({ unread });
}
