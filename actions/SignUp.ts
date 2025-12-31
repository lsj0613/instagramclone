// lib/actions/Auth.ts
"use server";

import { signIn } from "@/auth";
import { SignupSchema } from "@/lib/validation";
import connectDB from "@/lib/db";
import User from "@/models/User.model";
import bcrypt from "bcrypt";
import { AuthError } from "next-auth";

export type SignupState = {
  message?: string | null;
  errors?: {
    email?: string[];
    username?: string[];
    password?: string[];
  };
};

/**
 * Performs user signup using provided form data and initiates automatic sign-in on success.
 *
 * Validates input, creates a new user if no duplicate exists, hashes the password, saves the user,
 * and attempts to sign in with the registered credentials. If validation or authentication fails,
 * returns a state object containing a user-facing message and optional field-level errors.
 *
 * @param prevState - Previous signup UI state (optional); returned state can be used to update the UI.
 * @param formData - FormData containing `email`, `username`, and `password` submitted by the user.
 * @returns An updated `SignupState` with `message` and/or `errors` when signup or login fails; `undefined` when signup succeeds and sign-in is initiated.
 */
export async function signup(
  prevState: SignupState | undefined,
  formData: FormData
): Promise<SignupState | undefined> {
  // 1. 유효성 검사
  const validatedFields = SignupSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "입력 형식을 확인해주세요.",
    };
  }

  const { email, username, password } = validatedFields.data;

  try {
    await connectDB();

    // 2. 중복 사용자 확인
    const existingUser = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      return { message: "이미 존재하는 이메일 또는 사용자 이름입니다." };
    }

    // 3. 사용자 생성 및 저장
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      username: username.toLowerCase(),
      password: hashedPassword,
    });

    await newUser.save();

    // 4. 자동 로그인 처리 [핵심 수정 부분]
    // 가입된 정보(email, password)를 사용하여 credentials 로그인을 시도합니다.
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/", // 성공 시 홈 화면으로 이동
    });
  } catch (error) {
    // Auth.js의 리다이렉트 에러는 catch 문에서 다시 던져야 정상적으로 동작합니다.
    if (error instanceof AuthError) {
      return { message: "회원가입 후 로그인 중 오류가 발생했습니다." };
    }

    // 리다이렉트 처리를 위한 에러는 다시 던집니다.
    throw error;
  }
}