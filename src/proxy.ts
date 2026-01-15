import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  // 1. 세션에서 온보딩 완료 여부 가져오기 (auth.ts의 session 콜백 설정 필요)
  const hasFinishedOnboarding = req.auth?.user?.hasFinishedOnboarding;

  // 2. 경로 분류
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/signup";
  const isOnboardingRoute = pathname === "/onboarding";

  // 3. 비로그인 유저 처리: 홈(/), 로그인, 회원가입 외의 모든 경로는 로그인으로 리다이렉트
  if (!isLoggedIn) {
    if (!isPublicRoute) {
      return Response.redirect(new URL("/login", nextUrl));
    }
    return; // 홈페이지(/)나 로그인/회원가입은 허용
  }

  // 4. 로그인 유저 처리
  if (isLoggedIn) {
    // A. 온보딩 미완료 유저: /onboarding이 아닌 곳에 있다면 강제 이동
    if (!hasFinishedOnboarding && !isOnboardingRoute) {
      return Response.redirect(new URL("/onboarding", nextUrl));
    }

    // B. 온보딩 완료 유저가 /onboarding이나 로그인/회원가입 페이지에 접근하면 홈으로
    if (hasFinishedOnboarding && (isOnboardingRoute || pathname === "/login" || pathname === "/signup")) {
      return Response.redirect(new URL("/", nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};