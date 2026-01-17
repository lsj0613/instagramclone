import { signOut } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image"; // ⭐️ Image 컴포넌트 임포트
import { getCurrentUser } from "@/services/user.service";
import { UI_TEXT } from "@/shared/constants";

export default async function Home() {
  const currentUser = await getCurrentUser();

  return (
    <div className="p-8">
      {/* 상단 헤더 영역 */}
      <header className="flex justify-end items-center mb-8">
        {currentUser ? (
          <div className="flex items-center gap-4">
            {/* ⭐️ [추가됨] 프로필 이미지 영역 */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0">
              <Image
                src={currentUser.profileImage || "/default-profile.png"} // 이미지가 없으면 기본 이미지
                alt="Profile Image"
                fill // 부모 div(w-10 h-10)에 꽉 차게 설정
                className="object-cover"
                sizes="40px" // 성능 최적화 힌트
              />
            </div>

            <span className="text-gray-700 font-medium">
              {/* name이 없으면 username(아이디)이라도 표시 */}
              {currentUser.name ||
                currentUser.username ||
                UI_TEXT.DefaultUserName}
              님 환영합니다
            </span>

            {/* 로그아웃 처리 */}
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
              >
                {UI_TEXT.Logout}
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            {UI_TEXT.Login}
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
