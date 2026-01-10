"use server";

import { signIn } from "@/shared/functions/auth"; // auth.ts에서 내보낸 signIn 함수
import { LoginSchema } from "@/shared/functions/validation"; // 유효성 검사 스키마
import { AuthError } from "next-auth";
import { z } from "zod";

// 반환될 상태 타입 정의
export type LoginState = {
  message?: string | null;
  errors?: {
    email?: string[];
    password?: string[];
  };
};

/**
 * Credentials(이메일/비밀번호) 로그인 처리를 위한 서버 액션
 * React 19의 useActionState와 호환되도록 설계됨
 */
export async function authenticate(
  prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState | undefined> {
  // 1. FormData를 객체로 변환 및 Zod 유효성 검사
  const validatedFields = LoginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  // 유효성 검사 실패 시 에러 반환
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "입력한 정보를 다시 확인해주세요.",
    };
  }

  const { email, password } = validatedFields.data;

  try {
    // 2. NextAuth signIn 호출
    // redirect: false를 쓰지 않고, 서버 액션 내에서 리다이렉트 처리를 맡기는 것이 Next.js 16 권장 방식입니다.
    // 성공 시 내부적으로 NEXT_REDIRECT 에러를 throw하여 페이지를 이동시킵니다.
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/", // 로그인 성공 후 이동할 경로
    });
  } catch (error) {
    // 3. 에러 처리
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "이메일 또는 비밀번호가 올바르지 않습니다." };
        default:
          return { message: "로그인 중 알 수 없는 오류가 발생했습니다." };
      }
    }
    
    // 중요: 리다이렉트를 위한 에러는 다시 던져야 함 (Next.js 내부 로직)
    throw error;
  }
}

/**
 * Google 소셜 로그인 처리를 위한 서버 액션
 */
export async function googleLogin() {
  await signIn("google", { redirectTo: "/" });
}