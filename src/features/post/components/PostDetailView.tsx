"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { deletePostAction } from "@/features/post/actions";
import { PostDetailData } from "@/services/post.service";
import { UI_TEXT } from "@/shared/constants";
import isRedirectError from "@/shared/utils/redirect";
import { useLike } from "@/shared/hooks/use-like";

interface PostDetailViewProps {
  post: PostDetailData;
  CommentSection: React.ReactNode;
  CommentInput: React.ReactNode;
}

export default function PostDetailView({
  post,
  CommentSection,
  CommentInput,
}: PostDetailViewProps) {
  // ----------------------------------------------------------------------
  // 1. 💖 좋아요 로직
  // ----------------------------------------------------------------------
  const { isLiked, likeCount, toggleLike } = useLike({
    targetId: post.id,
    targetType: "POST",
    initialIsLiked: post.isLiked,
    initialLikeCount: post.likeCount,
  });

  // ----------------------------------------------------------------------
  // 2. 🗑️ 삭제 로직
  // ----------------------------------------------------------------------
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDeletePost = () => {
    // 모달을 먼저 닫고 confirm 창을 띄웁니다 (선택 사항)
    setIsMenuOpen(false);

    // 약간의 딜레이 후 실행 (UX상 자연스러움을 위해)
    setTimeout(() => {
      if (!confirm("정말 이 게시물을 삭제하시겠습니까?")) return;

      startDeleteTransition(async () => {
        try {
          const result = await deletePostAction(null, { postId: post.id });
          if (!result.success) {
            alert(result.message || "게시물 삭제에 실패했습니다.");
          }
        } catch (error) {
          if (isRedirectError(error)) throw error;
          console.error("Delete error:", error);
          alert("네트워크 오류가 발생했습니다.");
        }
      });
    }, 100);
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
  const isAuthor = post.isOwner;

  // ⭐️ 기존의 handleClickOutside useEffect는 모달 배경 클릭으로 대체되어 삭제함

  return (
    <>
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
          {/* 1. 헤더 (고정) */}
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
            {/* 더보기 메뉴 버튼 */}
            <div className="relative shrink-0 ml-1">
              <button
                onClick={() => setIsMenuOpen(true)} // 모달 열기
                className="text-gray-900 hover:text-gray-500 transition-colors p-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="6" cy="12" r="1.5" />
                  <circle cx="18" cy="12" r="1.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* 2. 본문 (고정, 스크롤 X) */}
          {post.caption && (
            <div className="p-4 border-b border-gray-100 shrink-0 max-h-[150px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              <span className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
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
          )}

          {/* 3. 댓글 목록 (스크롤 O) */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            {CommentSection}
          </div>

          {/* 4. 하단 액션 (좋아요 아이콘 + 종이비행기 + 개수) */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                {/* 좋아요 버튼 */}
                <button
                  onClick={toggleLike}
                  className={`focus:outline-none transition-transform active:scale-125 ${
                    isLiked
                      ? "text-red-500"
                      : "text-gray-900 hover:text-gray-600"
                  }`}
                >
                  {isLiked ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-7 h-7 animate-in zoom-in duration-200"
                    >
                      <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                    </svg>
                  ) : (
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

                {/* 종이비행기 아이콘 */}
                <button className="focus:outline-none hover:opacity-60 transition-opacity">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-7 h-7 text-gray-900 -rotate-45 mb-1"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </button>
              </div>

              {/* 좋아요 개수 */}
              <div className="font-semibold text-sm text-gray-900 pt-[2px]">
                좋아요 {likeCount.toLocaleString()}개
              </div>
            </div>
          </div>

          {/* 5. 댓글 입력창 (하단 고정) */}
          <div className="border-t border-gray-300 bg-white z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.02)]">
            {CommentInput}
          </div>
        </div>
      </article>

      {/* ⭐️ 옵션 모달 (Overlay) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="relative w-full max-w-xs overflow-hidden rounded-xl bg-white text-center shadow-2xl animate-in zoom-in-95 duration-200">
            {isAuthor ? (
              <>
                <button
                  className="w-full border-b border-gray-100 p-3.5 text-sm font-bold text-red-500 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                >
                  {isDeleting ? UI_TEXT.Deleting : UI_TEXT.Delete}
                </button>
                <button className="w-full border-b border-gray-100 p-3.5 text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100">
                  {UI_TEXT.Edit}
                </button>
              </>
            ) : (
              <button className="w-full border-b border-gray-100 p-3.5 text-sm font-bold text-red-500 hover:bg-gray-50 active:bg-gray-100">
                {UI_TEXT.Report}
              </button>
            )}
            <button
              className="w-full p-3.5 text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              {UI_TEXT.Cancel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
