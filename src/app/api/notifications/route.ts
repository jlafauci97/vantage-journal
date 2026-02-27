import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor");

  const notifications = await prisma.notification.findMany({
    where: { receiverId: session.user.id },
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  const hasMore = notifications.length > 20;
  const items = hasMore ? notifications.slice(0, 20) : notifications;

  return NextResponse.json({
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.all) {
    await prisma.notification.updateMany({
      where: { receiverId: session.user.id, read: false },
      data: { read: true },
    });
  } else if (body.ids?.length) {
    await prisma.notification.updateMany({
      where: { id: { in: body.ids }, receiverId: session.user.id },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
