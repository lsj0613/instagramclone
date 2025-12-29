import { getUserByUsername } from "@/lib/actions/GetUserByUsername";
import { notFound } from "next/navigation";
import Image from "next/image";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  // 1. URL 파라미터에서 username 추출 (Next.js 16+ 비동기 params)
  const { username } = await params;

  // 2. 서버 액션 호출
  const response = await getUserByUsername(username);

  // 3. 유저가 없으면 404 페이지로 이동
  if (!response.success || !response.data) {
    notFound();
  }

  const user = response.data;

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4">
      {/* 프로필 상단 헤더 영역 */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-20 border-b pb-10">
        {/* 프로필 이미지 */}
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <Image
            src={user.profileImage}
            alt={user.username}
            fill
            className="rounded-full object-cover border"
          />
        </div>

        {/* 유저 정보 및 통계 */}
        <div className="flex flex-col gap-4 flex-grow">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <h1 className="text-xl font-semibold">{user.username}</h1>
            <button className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition">
              프로필 편집
            </button>
          </div>

          {/* 게시물, 팔로워, 팔로잉 수 (게시물 수는 추후 구현 필요) */}
          <div className="flex gap-6 text-sm md:text-base">
            <div>게시물 <span className="font-semibold">0</span></div>
            <div>팔로워 <span className="font-semibold">{user.followers.length}</span></div>
            <div>팔로잉 <span className="font-semibold">{user.following.length}</span></div>
          </div>

          {/* 소개(Bio) 영역 */}
          <div className="text-sm">
            <p className="whitespace-pre-wrap">{user.bio || "소개글이 없습니다."}</p>
          </div>
        </div>
      </header>

      {/* 하단 탭 메뉴 및 게시물 그리드 영역 (추후 구현) */}
      <section className="py-8 text-center text-gray-500">
        <p>작성된 게시물이 없습니다.</p>
      </section>
    </div>
  );
}