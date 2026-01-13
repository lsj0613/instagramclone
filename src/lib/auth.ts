import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import db from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { LoginSchema } from "@/shared/schemas/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
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
            // 핵심: DB의 username을 표준 필드인 name에 담아서 반환
            return { 
              ...user, 
              id: String(user.id), 
              name: user.username 
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
            const emailPrefix = user.email.split('@')[0];
            const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            const generatedUsername = `${cleanPrefix}${randomSuffix}`;

            await db.insert(users).values({
              email: user.email,
              username: generatedUsername,
              profileImage: user.image,
            });
          }
        } catch (error) {
          console.error("Google 로그인 DB 저장 오류:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // 1. 최초 로그인 시점
      if (user) {
        if (account?.provider === "credentials") {
          // authorize에서 name에 username을 넣어줬으므로 그대로 전달
          token.id = user.id as string;
          token.name = user.name; 
        } 
        else if (account?.provider === "google") {
          // 구글 로그인 시 DB에서 해당 유저의 username을 가져와 name에 덮어씀
          const dbUser = await db.query.users.findFirst({
            where: eq(users.email, user.email!),
          });

          if (dbUser) {
            token.id = String(dbUser.id);
            token.name = dbUser.username; // 구글 실명 대신 DB의 username 사용
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      // 2. 세션 형성 시점: 토큰에 저장된 name(실제로는 username)을 세션으로 전달
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name; 
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});