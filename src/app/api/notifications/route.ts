import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/user.service";
import db from "@/lib/db";
import { notifications } from "@/db/schema";
import { eq, desc, lt, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const cursorId = searchParams.get("cursor"); // UUID v7 문자열

    // 1. 쿼리 조건: "내 알림이면서" + "커서보다 ID가 작은(오래된) 것"
    const whereConditions = [eq(notifications.recipientId, user.id)];

    if (cursorId) {
      whereConditions.push(lt(notifications.id, cursorId));
    }

    // 2. DB 조회 (PK 인덱스 스캔 = 압도적 성능)
    const items = await db.query.notifications.findMany({
      where: and(...whereConditions),
      limit: limit + 1,
      orderBy: [desc(notifications.id)], // 시간순 정렬 보장
      with: {
        actor: {
          columns: { id: true, username: true, profileImage: true },
        },
      },
    });

    // 3. 다음 커서 추출
    let nextCursor = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id; // 다음 커서도 깔끔하게 ID 그대로 사용
    }

    return NextResponse.json({
      items,
      nextCursor,
    });
  } catch (error) {
    console.error("[API] Notifications Error:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
