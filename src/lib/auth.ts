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
      id: string;
      username: string;
      name: string | null;
      hasFinishedOnboarding: boolean;
      profileImage: string | null; // ⭐️ 세션 타입에 추가
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    hasFinishedOnboarding?: boolean;
    profileImage?: string | null; // ⭐️ User 타입에 추가
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    name: string | null;
    hasFinishedOnboarding: boolean;
    profileImage: string | null; // ⭐️ JWT 토큰 타입에 추가
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
            return {
              id: String(user.id),
              username: user.username,
              name: user.name,
              email: user.email,
              hasFinishedOnboarding: user.hasFinishedOnboarding,
              profileImage: user.profileImage, // ⭐️ 로그인 성공 시 반환 객체에 추가
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
            const tempUsername =
              user.email.split("@")[0] +
              Math.random().toString(36).substring(2, 6);

            await db.insert(users).values({
              email: user.email,
              username: tempUsername,
              name: user.name ?? null,
              profileImage: user.image, // 구글 프로필 이미지 저장
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

    async jwt({ token, user, trigger, session }) {
      if (user) {
        // DB에서 최신 데이터 조회
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, token.email!),
        });

        if (dbUser) {
          token.id = String(dbUser.id);
          token.username = dbUser.username;
          token.name = dbUser.name;
          token.hasFinishedOnboarding = dbUser.hasFinishedOnboarding;
          token.profileImage = dbUser.profileImage; // ⭐️ 토큰에 DB 이미지 저장
        }
      }

      // ⭐️ 클라이언트에서 update() 호출 시 토큰 갱신 로직
      if (trigger === "update" && session?.user) {
        if (session.user.username) token.username = session.user.username;
        if (session.user.name !== undefined) token.name = session.user.name;
        if (session.user.hasFinishedOnboarding !== undefined)
          token.hasFinishedOnboarding = session.user.hasFinishedOnboarding;

        // 프사 변경 시 반영
        if (session.user.profileImage !== undefined) {
          token.profileImage = session.user.profileImage;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.name = token.name ?? null;
        session.user.hasFinishedOnboarding =
          token.hasFinishedOnboarding ?? false;

        // ⭐️ 토큰에 있는 이미지를 세션으로 전달 (없으면 null)
        session.user.profileImage = token.profileImage ?? null;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});
