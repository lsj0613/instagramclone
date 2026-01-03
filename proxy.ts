// middleware.ts
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // 인증이 필요한 경로 설정 (예: /post, /profile)
  const isProtected = nextUrl.pathname.startsWith("/createpost") || nextUrl.pathname.startsWith("/profile")|| nextUrl.pathname.startsWith("/message");

  if (isProtected && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};