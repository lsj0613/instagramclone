import { auth } from "@/shared/functions/auth";
import { getUserByUsername } from "@/features/user/actions/GetUserByUsername"; //
import { getPostsByUsername } from "@/features/post/actions/GetPostsByUsername"; // 위에서 만든 새 액션
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  // 1. URL 파라미터 및 세션 가져오기
  const { username } = await params;
  const session = await auth();

  // 2. 병렬로 데이터 fetching (유저 정보 + 게시물 리스트)
  // Promise.all을 사용하여 동시에 요청을 보내 성능을 높입니다.
  const [userRes, postsRes] = await Promise.all([
    getUserByUsername(username),
    getPostsByUsername(username),
  ]);

  // 3. 유저가 없으면 404
  if (!userRes.success || !userRes.data) {
    notFound();
  }

  const user = userRes.data;
  const posts = postsRes.data || [];

  // 4. 본인 프로필인지 확인 (세션의 유저네임과 현재 페이지 유저네임 비교)
  // auth.ts 설정을 보면 session.user.name에 username이 들어갑니다.
  const isOwner = session?.user?.name === user.username;

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4">
      {/* --- 프로필 헤더 --- */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-20 border-b border-gray-200 pb-10 mb-8">
        {/* 프로필 이미지 */}
        <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
          <Image
            src={user.profileImage || "/default-profile.png"} // 기본 이미지 처리
            alt={user.username}
            fill
            className="rounded-full object-cover border border-gray-200"
            sizes="(max-width: 768px) 128px, 160px"
            priority
          />
        </div>

        {/* 유저 정보 영역 */}
        <div className="flex flex-col gap-4 grow w-full md:w-auto">
          {/* 1열: 아이디 & 버튼 */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <h1 className="text-xl font-normal text-gray-800">
              {user.username}
            </h1>

            {/* 본인이면 '프로필 편집', 남이면 '팔로우' 버튼 표시 (여기선 편집만 구현) */}
            {isOwner ? (
              <button className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition text-black">
                프로필 편집
              </button>
            ) : (
              <button className="px-6 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition">
                팔로우
              </button>
            )}
          </div>

          {/* 2열: 통계 (게시물/팔로워/팔로잉) */}
          <div className="flex justify-center md:justify-start gap-8 text-base">
            <div>
              게시물 <span className="font-semibold">{posts.length}</span>
            </div>
            <div>
              팔로워{" "}
              <span className="font-semibold">{user.followers.length}</span>
            </div>
            <div>
              팔로잉{" "}
              <span className="font-semibold">{user.following.length}</span>
            </div>
          </div>

          {/* 3열: 이름 및 소개 (Bio) */}
          <div className="text-sm text-center md:text-left">
            <div className="font-semibold">{user.username}</div>
            <p className="whitespace-pre-wrap text-gray-700 mt-1">
              {user.bio || "소개글이 없습니다."}
            </p>
          </div>
        </div>
      </header>

      {/* --- 게시물 그리드 --- */}
      <section>
        {posts.length === 0 ? (
          // 게시물이 없을 때
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📷</span>
            </div>

            {/* 권한(isOwner)에 따른 타이틀 및 설명 분기 */}
            <h2 className="text-xl font-bold text-black mb-2">
              {isOwner ? "사진 공유" : "게시물 없음"}
            </h2>
            <p className="text-sm">
              {isOwner
                ? "사진을 공유하면 회원님의 프로필에 표시됩니다."
                : "아직 게시물이 없습니다."}
            </p>

            {/* 본인일 경우에만 작성 링크 노출 */}
            {isOwner && (
              <Link
                href="/createpost"
                className="mt-4 text-blue-500 font-semibold hover:underline text-sm"
              >
                첫 게시물 작성하기
              </Link>
            )}
          </div>
        ) : (
          // 게시물이 있을 때 (3열 그리드)
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="relative aspect-square group cursor-pointer block bg-gray-100"
              >
                <Image
                  src={post.image}
                  alt="게시물 썸네일"
                  fill
                  className="object-cover transition-opacity group-hover:opacity-90"
                  sizes="(max-width: 768px) 33vw, 300px"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
