import { auth, signOut } from "@/auth"; // auth.ts 경로 확인
import Link from "next/link";

export default async function Home() {
  // 1. 서버에서 세션 정보 가져오기
  const session = await auth();
  console.log(session);
  return (
    <div className="p-8">
      {/* 상단 헤더 영역 */}
      <header className="flex justify-end items-center mb-8">
        {session ? (
          // 로그인 된 경우: 이름과 로그아웃 버튼 표시
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">
              {session.user?.name || "사용자"}님 환영합니다
            </span>

            {/* 로그아웃 처리 (NextAuth v5 Server Action) */}
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                로그아웃
              </button>
            </form>
          </div>
        ) : (
          // 로그인 안 된 경우: 로그인 버튼 표시
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            로그인
          </Link>
        )}
      </header>

      {/* 페이지 본문 내용 */}
      <h1 className="text-3xl font-bold">홈페이지 메인 콘텐츠</h1>
      <p className="mt-4 text-gray-600">
        여기에 인스타그램 클론의 피드나 주요 내용이 들어갑니다.
      </p>
    </div>
  );
}
