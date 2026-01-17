import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import db from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { LoginSchema } from "@/shared/utils/validation";
import NextAuth, { type DefaultSession } from "next-auth";
import { env } from "@/lib/env";

// --- 1. 타입 정의 (Module Augmentation) ---
declare module "next-auth" {
  interface Session {
    user: {
      id: string; // ⭐️ 세션에는 오직 고유 ID만 유지
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string; // ⭐️ 토큰에도 오직 고유 ID만 저장
  }
}

// --- 2. NextAuth 설정 ---
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      async authorize(credentials) {
        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user || !user.password) return null;

          const passwordMatch = await bcrypt.compare(password, user.password);

          if (passwordMatch) {
            // ⭐️ 로그인 성공 시 최소한의 식별 정보만 반환
            return {
              id: String(user.id),
              email: user.email,
            };
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });

          if (!existingUser) {
            // 구글 가입 시 임시 닉네임 생성 및 저장 로직 유지
            const tempUsername =
              user.email.split("@")[0] +
              Math.random().toString(36).substring(2, 6);

            await db.insert(users).values({
              email: user.email,
              username: tempUsername,
              name: user.name ?? null,
              profileImage: user.image,
              hasFinishedOnboarding: false,
            });
          }
        } catch (error) {
          console.error("로그인 중 DB 작업 오류:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      // ⭐️ 최초 로그인(sign-in) 시점에만 DB에서 불변하는 내부 ID를 가져와 토큰에 고정
      if (user) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email!),
        });
        if (dbUser) {
          token.id = String(dbUser.id);
        }
      }
      return token;
    },

    async session({ session, token }) {
      // ⭐️ 토큰의 ID를 세션 객체로 전달
      if (token.id && session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});
