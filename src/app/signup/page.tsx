// app/signup/page.tsx 생성
"use client";

import { useActionState } from "react";
import { signup } from "@/features/auth/actions/sign-up";
import Link from "next/link";

export default function SignupPage() {
  // React 19 useActionState 활용
  const [state, dispatch, isPending] = useActionState(signup, undefined);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center rounded-sm border bg-white p-8 shadow-sm">
          <h1 className="mb-4 font-serif text-4xl font-bold tracking-tighter">
            Instagram
          </h1>
          <p className="mb-6 text-center font-semibold text-gray-500 text-sm">
            친구들의 사진과 동영상을 보려면 가입하세요.
          </p>

          <form action={dispatch} className="flex w-full flex-col gap-3">
            {/* 이메일 입력 */}
            <div className="flex flex-col gap-1">
              <input
                name="email"
                type="email"
                placeholder="이메일 주소"
                required
                className="w-full rounded-sm border border-gray-300 bg-gray-50 px-2 py-2 text-xs placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
              {state?.errors?.email && (
                <p className="text-xs text-red-500">{state.errors.email[0]}</p>
              )}
            </div>

            {/* 사용자 이름 입력 */}
            <div className="flex flex-col gap-1">
              <input
                name="username"
                type="text"
                placeholder="사용자 이름"
                required
                className="w-full rounded-sm border border-gray-300 bg-gray-50 px-2 py-2 text-xs placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
              {state?.errors?.username && (
                <p className="text-xs text-red-500">
                  {state.errors.username[0]}
                </p>
              )}
            </div>

            {/* 비밀번호 입력 */}
            <div className="flex flex-col gap-1">
              <input
                name="password"
                type="password"
                placeholder="비밀번호"
                required
                className="w-full rounded-sm border border-gray-300 bg-gray-50 px-2 py-2 text-xs placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              />
              {state?.errors?.password && (
                <p className="text-xs text-red-500">
                  {state.errors.password[0]}
                </p>
              )}
            </div>

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-md bg-sky-500 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-70"
            >
              {isPending ? "가입 중..." : "가입"}
            </button>

            {state?.message && (
              <p className="mt-2 text-center text-xs text-red-500">
                {state.message}
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            가입하면 Instagram의 약관, 데이터 정책 및 쿠키 정책에 동의하게
            됩니다.
          </p>
        </div>

        <div className="flex w-full items-center justify-center rounded-sm border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-800">
            계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-semibold text-sky-500 hover:underline"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
