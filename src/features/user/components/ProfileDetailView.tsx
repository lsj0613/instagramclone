"use client";

import Image from "next/image";
import Link from "next/link";
import { UserProfileData } from "@/services/user.service";

export default function ProfileDetailView({ user }: { user: UserProfileData }) {
  return (
    <div className="max-w-4xl mx-auto pt-8 px-4">
      {/* --- 프로필 헤더 --- */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-20 border-b border-gray-200 pb-10 mb-8">
        {/* 프로필 이미지 */}
        <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
          <Image
            src={user.profileImage || "/default-profile.png"}
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

            {user.isOwner ? (
              <button className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition text-black">
                프로필 편집
              </button>
            ) : (
              <button className="px-6 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition">
                팔로우
              </button>
            )}
          </div>

          {/* 2열: 통계 */}
          <div className="flex justify-center md:justify-start gap-8 text-base">
            <div>
              게시물 <span className="font-semibold">{user.postCount}</span>
            </div>
            <div>
              팔로워 <span className="font-semibold">{user.followerCount}</span>
            </div>
            <div>
              팔로잉{" "}
              <span className="font-semibold">{user.followingCount}</span>
            </div>
          </div>

          {/* 3열: 이름 및 소개 */}
          <div className="text-sm text-center md:text-left">
            <div className="font-semibold">{user.name}</div>
            <p className="whitespace-pre-wrap text-gray-700 mt-1">
              {user.bio || "소개글이 없습니다."}
            </p>
          </div>
        </div>
      </header>

      {/* --- 게시물 그리드 --- */}
      <section>
        {user.postCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📷</span>
            </div>

            <h2 className="text-xl font-bold text-black mb-2">
              {user.isOwner ? "사진 공유" : "게시물 없음"}
            </h2>
            <p className="text-sm">
              {user.isOwner
                ? "사진을 공유하면 회원님의 프로필에 표시됩니다."
                : "아직 게시물이 없습니다."}
            </p>

            {user.isOwner && (
              <Link
                href="/createpost"
                className="mt-4 text-blue-500 font-semibold hover:underline text-sm"
              >
                첫 게시물 작성하기
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {user.posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="relative aspect-square group cursor-pointer block bg-gray-100"
              >
                <Image
                  src={post.images[0]?.url ?? "/no-postImage.png"}
                  alt="게시물 썸네일"
                  fill
                  className="object-cover transition-opacity"
                  sizes="(max-width: 768px) 33vw, 300px"
                />

                {/* 호버 오버레이 */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 md:gap-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <svg
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="w-6 h-6"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span>{post.likeCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <svg
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      className="w-6 h-6"
                    >
                      <path d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z" />
                    </svg>
                    <span>{post.commentCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
