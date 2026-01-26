"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { deletePostAction } from "@/features/post/actions";
import { PostDetailData } from "@/services/post.service";
import { UI_TEXT } from "@/shared/constants";
import isRedirectError from "@/shared/utils/redirect";
import { useLike } from "@/shared/hooks/use-like"; // ⭐️ useLike 훅 import

interface PostDetailViewProps {
  post: PostDetailData;
  children?: React.ReactNode;
}

export default function PostDetailView({
  post,
  children,
}: PostDetailViewProps) {
  // ----------------------------------------------------------------------
  // 1. 💖 좋아요 로직 (useLike 훅 사용)
  // ----------------------------------------------------------------------
  const { isLiked, likeCount, toggleLike } = useLike({
    targetId: post.id,
    targetType: "POST",
    initialIsLiked: post.isLiked, // DTO에 해당 필드가 있다고 가정
    initialLikeCount: post.likeCount,
  });

  // ----------------------------------------------------------------------
  // 2. 🗑️ 삭제 로직
  // ----------------------------------------------------------------------
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDeletePost = () => {
    if (!confirm("정말 이 게시물을 삭제하시겠습니까?")) return;

    startDeleteTransition(async () => {
      try {
        const result = await deletePostAction(null, { postId: post.id });

        if (!result.success) {
          alert(result.message || "게시물 삭제에 실패했습니다.");
        }
        // 성공 시 리다이렉트는 서버 액션 내부에서 처리됨
      } catch (error) {
        // Next.js 리다이렉트 에러는 다시 던져줘야 정상 작동함
        if (isRedirectError(error)) {
          throw error;
        }
        console.error("Delete error:", error);
        alert("네트워크 오류가 발생했습니다.");
      }
    });
  };

  // ----------------------------------------------------------------------
  // 3. 🖼️ 이미지 슬라이더 로직
  // ----------------------------------------------------------------------
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = post.images.length > 1;
  const lastIndex = post.images.length - 1;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImageIndex === 0) return;
    setCurrentImageIndex((prev) => prev - 1);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImageIndex === lastIndex) return;
    setCurrentImageIndex((prev) => prev + 1);
  };

  const showPrevButton = hasMultipleImages && currentImageIndex > 0;
  const showNextButton = hasMultipleImages && currentImageIndex < lastIndex;

  // ----------------------------------------------------------------------
  // 4. ⚙️ 메뉴(더보기) 로직
  // ----------------------------------------------------------------------
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAuthor = post.isOwner;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <article className="flex flex-col md:flex-row w-full max-w-[1200px] h-[85vh] bg-white border border-gray-300 rounded-xl overflow-hidden shadow-2xl">
      {/* --- [좌측] 이미지 영역 --- */}
      <div className="w-full md:w-[60%] lg:w-[65%] bg-black relative flex items-center justify-center overflow-hidden h-[50%] md:h-full group select-none">
        <div
          className="flex w-full h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {post.images.map((image, index) => (
            <div
              key={image.id || index}
              className="relative w-full h-full shrink-0"
            >
              <Image
                src={image.url}
                alt={`Post content ${index + 1}`}
                fill
                className="object-contain"
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px"
              />
            </div>
          ))}
        </div>

        {hasMultipleImages && (
          <>
            {showPrevButton && (
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full text-white/90 bg-black/20 hover:bg-black/50 backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            )}
            {showNextButton && (
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full text-white/90 bg-black/20 hover:bg-black/50 backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            )}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 z-20">
              {post.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                    idx === currentImageIndex
                      ? "bg-white scale-125 opacity-100"
                      : "bg-white/40 hover:bg-white/70 opacity-80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* --- [우측] 정보 영역 --- */}
      <div className="w-full md:w-[40%] lg:w-[35%] flex flex-col h-full bg-white relative border-l border-gray-100">
        {/* 1. 헤더 */}
        <div className="p-4 border-b border-gray-100 flex gap-3 items-center shrink-0 h-[72px]">
          <div className="w-9 h-9 rounded-full border border-gray-100 relative overflow-hidden shrink-0">
            <Image
              src={post.author.profileImage || "/default-profile.png"}
              alt={post.author.username}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/profile/${post.author.username}`}
              className="font-semibold text-sm text-gray-900 hover:text-gray-600 transition-colors leading-none inline-block"
            >
              {post.author.username}
            </Link>
            {post.locationName && (
              <div className="text-xs text-gray-500 mt-0.5 truncate">
                {post.locationName}
              </div>
            )}
          </div>
          <div className="relative shrink-0 ml-1" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-900 hover:text-gray-500 transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="6" cy="12" r="1.5" />
                <circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
            {isMenuOpen && (
              <div className="absolute top-10 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden flex flex-col text-sm">
                {isAuthor ? (
                  <>
                    <button
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-3 font-bold text-red-500 hover:bg-gray-50 border-b border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? UI_TEXT.Deleting : UI_TEXT.Delete}
                    </button>

                    <button className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-50 border-b border-gray-100">
                      {UI_TEXT.Edit}
                    </button>
                  </>
                ) : (
                  <button className="w-full text-left px-4 py-3 text-red-500 font-bold border-b border-gray-100 hover:bg-gray-50">
                    {UI_TEXT.Report}
                  </button>
                )}
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-50"
                >
                  {UI_TEXT.Cancel}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. 스크롤 영역 (본문 + 댓글) */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide flex flex-col">
          {/* 본문 (Caption) */}
          {post.caption && (
            <div className="flex gap-3 mb-6 shrink-0">
              <div className="w-8 h-8 rounded-full border border-gray-100 relative overflow-hidden shrink-0">
                <Image
                  src={post.author.profileImage || "/default-profile.png"}
                  alt={post.author.username}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 text-sm">
                <span className="font-semibold mr-2">
                  {post.author.username}
                </span>
                <span className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {post.caption}
                </span>
                <div
                  className="mt-2 text-xs text-gray-400"
                  suppressHydrationWarning
                >
                  {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 댓글 목록 (children) */}
          <div className="flex-1">{children}</div>
        </div>

        {/* 3. 하단 액션 (좋아요 등) */}
        <div className="p-4 border-t border-gray-100 bg-white mt-auto z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              {/* ⭐️ 좋아요 버튼 (useLike 훅의 toggle과 state 연결) */}
              <button
                onClick={toggleLike}
                className={`focus:outline-none transition-transform active:scale-125 ${
                  isLiked ? "text-red-500" : "text-gray-900 hover:text-gray-600"
                }`}
              >
                {isLiked ? (
                  // ❤️ 꽉 찬 하트
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-7 h-7 animate-in zoom-in duration-200"
                  >
                    <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                  </svg>
                ) : (
                  // 🤍 빈 하트
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-7 h-7"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                    />
                  </svg>
                )}
              </button>

              <button className="focus:outline-none hover:opacity-60 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-gray-900"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 20.25c4.97 0 9-3.69 9-8.25s-4.03-8.25-9-8.25S3 7.44 3 12c0 1.55.51 3.01 1.38 4.19.96 1.3 1.34 2.23 1.1 3.47-.13.7.45 1.39 1.11 1.39 3.07 0 4.36-1.07 5.09-1.96.22-.27.56-.45.92-.56.67-.2 1.45-.3 2.28-.3z"
                  />
                </svg>
              </button>
              <button className="focus:outline-none hover:opacity-60 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-gray-900"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* ⭐️ 좋아요 개수 (useLike 훅의 state 연결) */}
          <div className="font-semibold text-sm text-gray-900">
            좋아요 {likeCount.toLocaleString()}개
          </div>
        </div>
      </div>
    </article>
  );
}
