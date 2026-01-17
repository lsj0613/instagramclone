// components/SessionProvider.tsx
"use client";
import { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export default function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null; // 사용 중인 세션 타입 적용
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
