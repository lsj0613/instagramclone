"use client";

import Image from "next/image";
import Link from "next/link";
import { UserProfileData } from "@/services/user.service";
import { Lock } from "lucide-react";

export default function ProfileDetailView({ user }: { user: UserProfileData }) {
  const isPrivateAccount = user.isPrivate && !user.isOwner;

  return (
    <div className="max-w-[935px] mx-auto pt-8 px-5">
      {/* --- 프로필 헤더 --- */}
      <header className="flex flex-col md:flex-row mb-10">
        {/* [좌측] 프로필 이미지 영역 (PC 기준 너비 고정 및 정렬) */}
        <div className="flex-shrink-0 md:w-[290px] flex justify-center md:justify-center items-start md:mr-[30px]">
          <div className="relative w-[77px] h-[77px] md:w-[150px] md:h-[150px]">
            <Image
              src={user.profileImage || "/default-profile.png"}
              alt={user.username}
              fill
              className="rounded-full object-cover border border-gray-200"
              sizes="(max-width: 768px) 77px, 150px"
              priority
            />
          </div>
        </div>

        {/* [우측] 유저 정보 영역 */}
        <div className="flex flex-col flex-grow md:mt-3">
          {/* 1열: 아이디 & 버튼 */}
          <div className="flex flex-col md:flex-row md:items-center mb-5 gap-4 md:gap-5">
            <h1 className="text-[20px] font-normal text-gray-900 leading-8 shrink-0">
              {user.username}
            </h1>

            <div className="flex gap-2 flex-grow md:flex-grow-0">
              {user.isOwner ? (
                <>
                  <button className="px-4 py-[7px] bg-[#efefef] hover:bg-[#dbdbdb] rounded-lg text-sm font-semibold transition text-black">
                    프로필 편집
                  </button>
                  <button className="px-4 py-[7px] bg-[#efefef] hover:bg-[#dbdbdb] rounded-lg text-sm font-semibold transition text-black">
                    보관된 스토리 보기
                  </button>
                </>
              ) : (
                <>
                  {isPrivateAccount ? (
                    /* 비공개 계정: 팔로우 버튼이 메시지 버튼 위치까지 확장됨 */
                    <button className="flex-1 md:w-[250px] py-[7px] bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold transition">
                      팔로우
                    </button>
                  ) : (
                    <>
                      <button className="px-6 py-[7px] bg-[#0095f6] hover:bg-[#1877f2] text-white rounded-lg text-sm font-semibold transition">
                        팔로우
                      </button>
                      <button className="px-4 py-[7px] bg-[#efefef] hover:bg-[#dbdbdb] text-black rounded-lg text-sm font-semibold transition">
                        메시지 보내기
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 2열: 통계 (PC에서만 보임) */}
          {/* ⭐️ 수정됨: gap-10 -> gap-16으로 간격 넓힘 */}
          <ul className="hidden md:flex gap-16 mb-5 text-[16px]">
            <li>
              게시물 <span className="font-semibold">{user.postCount}</span>
            </li>
            <li>
              팔로워 <span className="font-semibold">{user.followerCount}</span>
            </li>
            <li>
              팔로잉{" "}
              <span className="font-semibold">{user.followingCount}</span>
            </li>
          </ul>

          {/* 3열: 이름 및 소개 */}
          <div className="text-[14px]">
            <div className="font-semibold text-gray-900">{user.name}</div>
            <p className="whitespace-pre-wrap text-gray-900 mt-1 leading-snug">
              {user.bio || ""}
            </p>
          </div>
        </div>
      </header>

      {/* 모바일용 통계 (헤더 하단 분리) */}
      <ul className="flex md:hidden justify-around py-3 border-t border-gray-200 text-sm mb-4">
        <li className="flex flex-col items-center">
          <span className="font-semibold">{user.postCount}</span>
          <span className="text-gray-500">게시물</span>
        </li>
        <li className="flex flex-col items-center">
          <span className="font-semibold">{user.followerCount}</span>
          <span className="text-gray-500">팔로워</span>
        </li>
        <li className="flex flex-col items-center">
          <span className="font-semibold">{user.followingCount}</span>
          <span className="text-gray-500">팔로잉</span>
        </li>
      </ul>

      {/* ⭐️ 구분선 중앙에 텍스트가 위치하는 디자인 */}
      <div className="relative flex items-center justify-center my-8 md:my-4">
        {/* 전체 가로지르는 선 */}
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-300"></div>
        </div>

        {/* 중앙 콘텐츠 (배경색을 깔아 선을 가림) */}
        <div className="relative px-4 bg-white flex items-center gap-1.5">
          <svg
            aria-label="게시물"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            className="w-3 h-3 text-black"
          >
            <rect height="18" width="18" x="3" y="3"></rect>
            <line x1="3" x2="21" y1="9.015" y2="9.015"></line>
            <line x1="3" x2="21" y1="14.985" y2="14.985"></line>
            <line x1="9.015" x2="9.015" y1="3" y2="21"></line>
            <line x1="14.985" x2="14.985" y1="3" y2="21"></line>
          </svg>
          <span className="text-[12px] font-semibold tracking-widest text-black">
            게시물
          </span>
        </div>
      </div>

      {/* --- 콘텐츠 영역 (분기 처리) --- */}
      {isPrivateAccount ? (
        // 🔒 비공개 계정 화면
        <div className="flex flex-col items-center justify-center py-16 bg-white">
          <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center mb-6">
            <Lock strokeWidth={1.5} size={32} />
          </div>
          <h2 className="text-sm font-bold text-black mb-2">
            비공개 계정입니다
          </h2>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            사진 및 동영상을 보려면 팔로우하세요.
          </p>
        </div>
      ) : (
        // 📷 공개 계정 그리드
        <section>
          {user.postCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📷</span>
              </div>

              <h2 className="text-2xl font-bold text-black mb-2">
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
                  className="mt-4 text-[#0095f6] font-semibold hover:text-[#00376b] text-sm"
                >
                  첫 게시물 작성하기
                </Link>
              )}
            </div>
          ) : (
            /* 게시물 그리드 */
            <div className="grid grid-cols-3 gap-1">
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
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    {/* 좋아요 정보 */}
                    <div className="flex items-center gap-2">
                      <svg
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        className="w-8 h-8 relative -top-[3px]"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span className="text-2xl font-bold">
                        {post.likeCount}
                      </span>
                      {/* 텍스트 크기 확대 */}
                    </div>

                    {/* 댓글 정보 */}
                    <div className="flex items-center gap-2">
                      <svg
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        className="w-7 h-7 relative -top-[3px]"
                      >
                        <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10c-1.85 0-3.58-.51-5.08-1.4l-4.22 1.35c-.65.21-1.31-.38-1.16-1.04l.87-3.79C2.96 15.82 2 14.01 2 12z" />
                      </svg>
                      <span className="text-2xl font-bold">
                        {post.commentCount}
                      </span>{" "}
                      {/* 텍스트 크기 확대 */}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
