// middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // ⭐️ 로그인이 필요 없는 경로 목록 정의
  // (루트, 로그인, 회원가입은 누구나 접근 가능)
  const publicPaths = ["/", "/login", "/signup", "forgot-password"];

  const isPublicPath = publicPaths.includes(req.nextUrl.pathname);

  // 로그인 안 했고(req.auth 없음) && 비공개 경로(!isPublicPath)로 접근 시 리다이렉트
  if (!req.auth && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 그 외(로그인 했거나, 공개 경로인 경우) 통과
  return NextResponse.next();
});

export const config = {
  // api, static 파일, 이미지, 파비콘 등을 제외한 모든 경로에서 미들웨어 실행
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
