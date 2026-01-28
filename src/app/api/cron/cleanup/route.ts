import { NextResponse } from "next/server";
import { cleanupOrphanedImages } from "@/services/cleanup.service"; // 위에서 만든 파일 경로

// Vercel Cron은 GET 요청을 보냅니다.
export async function GET(request: Request) {
  // 1. 보안 검사: Authorization 헤더 확인
  const authHeader = request.headers.get("authorization");

  // .env에 설정한 CRON_SECRET과 일치하는지 확인
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. 정리 로직 실행
    const result = await cleanupOrphanedImages();

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
