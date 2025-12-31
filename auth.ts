// auth.ts (프로젝트 루트 또는 lib 폴더)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import connectDB from "@/lib/db"; //
import User, { IUser } from "@/lib/models/User.model"; //
import bcrypt from "bcrypt";
import { LoginSchema } from "@/lib/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        // 1. 데이터 검증 (Zod)
        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;

          await connectDB(); //
          const user = await User.findOne({ email }).lean();

          // 2. 사용자 존재 및 비밀번호 일치 여부 확인
          if (!user || !user.password) return null;

          const passwordMatch = await bcrypt.compare(password, user.password);
          if (passwordMatch) return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    // 소셜 로그인 시 DB에 사용자 정보가 없으면 생성하거나 업데이트
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectDB();
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            const newUser = new User({
              username: user.name?.replace(/\s/g, "").toLowerCase(),
              email: user.email,
              profileImage: user.image,
            });
            await newUser.save();
          }
        } catch (error) {
          console.error("Google 로그인 DB 저장 오류:", error);
          return false;
        }
      }
      return true;
    },
    // JWT 토큰에 사용자 ID 추가
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as IUser).username;
      }
      return token;
    },
    // 세션에서 사용자 ID 접근 가능하게 설정
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.username as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" }, // JWT 방식 명시
  pages: {
    signIn: "/login", // 커스텀 로그인 페이지 경로
  },
});
