"use client";

import React from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Wraps NextAuth's SessionProvider and disables refetching on window focus to reduce session requests.
 *
 * @param children - React nodes that will receive the NextAuth session context
 * @returns A JSX element that provides NextAuth session context to its children
 */
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