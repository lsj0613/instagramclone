// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import connectDB from "@/shared/functions/db";
import User, { IUser } from "@/features/user/models/user.model";
import bcrypt from "bcrypt";
import { LoginSchema } from "@/shared/functions/validation";

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
          await connectDB();
          const user = await User.findOne({ email }).lean();

          if (!user || !user.password) return null;

          const passwordMatch = await bcrypt.compare(password, user.password);
          if (passwordMatch) {
            // Credentials 방식은 여기서 리턴한 객체가 jwt 콜백의 user로 전달됨
            return {
              ...user,
              id: user._id.toString(),
            };
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectDB();
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            const newUser = new User({
              username: (() => {
                if (!user.email) return "user_" + Math.random().toString(36).substring(2, 7);
                const emailPrefix = user.email.split('@')[0];
                const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                const randomSuffix = Math.random().toString(36).substring(2, 6);
                return `${cleanPrefix}${randomSuffix}`;
              })(),
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

    // [핵심 수정 부분] jwt 콜백
    async jwt({ token, user, account }) {
      // 로그인 시점 (user 객체가 있을 때)
      if (user) {
        // 1. Credentials 로그인인 경우: authorize에서 리턴한 값(username 포함)이 user에 이미 있음
        if (account?.provider === "credentials") {
          token.id = user.id;
          token.username = (user as IUser).username; // authorize에서 넘겨준 값
        }
        // 2. Google (소셜) 로그인인 경우: user는 구글 정보일 뿐이므로 DB 조회 필요
        else if (account?.provider === "google") {
           await connectDB();
           // 이메일로 DB에서 유저 정보를 찾아옴 (signIn에서 이미 생성됨이 보장됨)
           const dbUser = await User.findOne({ email: user.email });
           
           if (dbUser) {
             token.id = dbUser._id.toString();
             token.username = dbUser.username; // DB에 있는 username을 토큰에 저장
           }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        // 이제 token.username에 DB값이 확실히 들어있으므로 name에 매핑됨
        session.user.name = token.username as string; 
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});