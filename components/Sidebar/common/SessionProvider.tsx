"use client";

import React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider
      refetchOnWindowFocus={false} // 💡 세션 요청 횟수를 줄여 서버 부하 감소
    >
      {children}
    </NextAuthSessionProvider>
  );
}
