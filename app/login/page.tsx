"use client";

import { useActionState } from "react";
import { authenticate, googleLogin } from "@/lib/actions/Auth"; // 작성한 서버 액션 import
import Link from "next/link";
import Image from "next/image"; // 로고 이미지용 (없으면 텍스트로 대체 가능)

export default function LoginPage() {
  // useActionState: React 19의 폼 상태 관리 훅
  // state: 서버 액션에서 리턴한 값 (에러 메시지 등)
  // dispatch: 폼 제출 시 실행할 함수
  // isPending: 로딩 상태 (제출 중일 때 true)
  const [state, dispatch, isPending] = useActionState(authenticate, undefined);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-4">
        
        {/* 1. 메인 로그인 카드 */}
        <div className="flex flex-col items-center rounded-sm border bg-white p-8 shadow-sm">
          {/* 로고 영역 (이미지가 없다면 텍스트로 대체) */}
          <h1 className="mb-8 font-serif text-4xl font-bold tracking-tighter">
            Instagram
          </h1>

          {/* 이메일/비밀번호 로그인 폼 */}
          <form action={dispatch} className="flex w-full flex-col gap-3">
            
            {/* 이메일 입력 */}
            <div className="flex flex-col gap-1">
              <input
                name="email"
                type="email"
                placeholder="전화번호, 사용자 이름 또는 이메일"
                required
                className="w-full rounded-sm border border-gray-300 bg-gray-50 px-2 py-2 text-xs focus:border-gray-400 focus:outline-none"
              />
              {/* 이메일 관련 에러 메시지 표시 */}
              {state?.errors?.email && (
                <p className="text-xs text-red-500">{state.errors.email[0]}</p>
              )}
            </div>

            {/* 비밀번호 입력 */}
            <div className="flex flex-col gap-1">
              <input
                name="password"
                type="password"
                placeholder="비밀번호"
                required
                className="w-full rounded-sm border border-gray-300 bg-gray-50 px-2 py-2 text-xs focus:border-gray-400 focus:outline-none"
              />
              {/* 비밀번호 관련 에러 메시지 표시 */}
              {state?.errors?.password && (
                <p className="text-xs text-red-500">{state.errors.password[0]}</p>
              )}
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-md bg-sky-500 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-70"
            >
              {isPending ? "로그인 중..." : "로그인"}
            </button>
            
            {/* 전체 에러 메시지 (로그인 실패 등) */}
            {state?.message && (
              <p className="mt-2 text-center text-xs text-red-500">
                {state.message}
              </p>
            )}
          </form>

          {/* 구분선 (또는) */}
          <div className="my-5 flex w-full items-center gap-4">
            <div className="h-px flex-1 bg-gray-300" />
            <span className="text-xs font-semibold text-gray-500">또는</span>
            <div className="h-px flex-1 bg-gray-300" />
          </div>

          {/* 구글 로그인 버튼 (별도 폼으로 감싸야 함) */}
          <form action={googleLogin} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-[#385185] transition hover:text-[#1d3a7a]"
            >
              {/* 구글 아이콘 (SVG) */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
              </svg>
              Google로 로그인
            </button>
          </form>

          {/* 비밀번호 찾기 */}
          <Link
            href="/forgot-password"
            className="mt-4 text-xs text-[#00376b] hover:underline"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>

        {/* 2. 회원가입 링크 카드 */}
        <div className="flex w-full items-center justify-center rounded-sm border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-800">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="font-semibold text-sky-500 hover:underline">
              가입하기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}