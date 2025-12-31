// components/SessionProvider.tsx
"use client";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Wraps the given children with NextAuth's session provider so they can access authentication session state.
 *
 * @param children - React node(s) rendered inside the session provider
 * @returns A React element that provides NextAuth session context to `children`
 */
export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}