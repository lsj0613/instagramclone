import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import db from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { LoginSchema } from "@/shared/validation";
import { JWT } from "next-auth/jwt";
import NextAuth, { type DefaultSession } from "next-auth";

// --- 1. 타입 정의 (Module Augmentation) ---
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string; // null을 허용하지 않는 string으로 명시
      hasFinishedOnboarding: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    hasFinishedOnboarding?: boolean;
    name?: string; // 여기도 string으로 명시
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string; // JWT 토큰 내의 name도 string으로 명시
    hasFinishedOnboarding: boolean;
  }
}

// --- 2. NextAuth 설정 ---
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // 동의창을 강제로 띄워 계정 선택을 유도
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
            return {
              id: String(user.id),
              name: user.username,
              email: user.email,
              hasFinishedOnboarding: user.hasFinishedOnboarding,
            };
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // 구글 로그인 시 DB에 유저가 없으면 '미완료' 상태로 생성
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, user.email),
          });

          if (!existingUser) {
            // 초기 임시 유저네임 생성 (이후 온보딩에서 변경)
            const tempUsername =
              user.email.split("@")[0] +
              Math.random().toString(36).substring(2, 6);

            await db.insert(users).values({
              email: user.email,
              username: tempUsername,
              profileImage: user.image,
              hasFinishedOnboarding: false, // 온보딩 필요 상태로 설정
            });
          }
        } catch (error) {
          console.error("로그인 중 DB 작업 오류:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // 1. 최초 로그인 시
      if (user) {
        // DB에서 최신 정보를 가져와 토큰에 주입
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email!),
        });

        if (dbUser) {
          token.id = String(dbUser.id);
          token.name = dbUser.username;
          token.hasFinishedOnboarding = dbUser.hasFinishedOnboarding;
        }
      }

      // 2. 세션 업데이트 시 (온보딩 완료 후 클라이언트에서 호출할 용도)
      if (trigger === "update" && session) {
        token.name = session.user.name;
        token.hasFinishedOnboarding = session.user.hasFinishedOnboarding;
      }

      return token;
    },

    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.hasFinishedOnboarding = token.hasFinishedOnboarding;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});
