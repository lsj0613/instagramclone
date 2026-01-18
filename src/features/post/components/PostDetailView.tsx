"use client";

import {
  useState,
  useOptimistic,
  useTransition,
  useEffect,
  useRef,
  useActionState,
} from "react";
import Image from "next/image";
import {
  deletePostAction,
  togglePostLikeAction,
} from "@/features/post/actions";
import { PostDetailData } from "@/services/post.service";
import Link from "next/link";
import { UI_TEXT } from "@/shared/constants";

export default function PostDetailView({ post }: { post: PostDetailData }) {
  // ... (기존 hook 및 상태 유지: isPending, deletePost, isMenuOpen 등)
  const [isPending, startTransition] = useTransition();
  const [isError, setIsError] = useState(false);

  const deletePostWithId = deletePostAction.bind(null, post.id);
  const [deletingState, deletePost, isDeleting] = useActionState(
    deletePostWithId,
    null
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAuthor = post.isOwner;

  const [optimisticState, setOptimisticState] = useOptimistic(
    { isLiked: post.isLiked, likeCount: post.likeCount },
    (state, newIsLiked: boolean) => ({
      isLiked: newIsLiked,
      likeCount: state.likeCount + (newIsLiked ? 1 : -1),
    })
  );

  const isLiked = optimisticState.isLiked;

  const handleLikeClick = () => {
    if (isAuthor) return;
    const nextState = !optimisticState.isLiked;
    startTransition(async () => {
      try {
        setOptimisticState(nextState);
        await togglePostLikeAction(post.id);
        setIsError(false);
      } catch (error) {
        setIsError(true);
        setTimeout(() => setIsError(false), 500);
      }
    });
  };

  // --- 이미지 슬라이더 로직 (루프핑 제거됨) ---
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = post.images.length > 1;
  const lastIndex = post.images.length - 1;

  // ⭐️ 경계 체크 로직 추가
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImageIndex === 0) return; // 첫 번째면 동작 안 함
    setCurrentImageIndex((prev) => prev - 1);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImageIndex === lastIndex) return; // 마지막이면 동작 안 함
    setCurrentImageIndex((prev) => prev + 1);
  };

  // ⭐️ 버튼 표시 여부 계산
  const showPrevButton = hasMultipleImages && currentImageIndex > 0;
  const showNextButton = hasMultipleImages && currentImageIndex < lastIndex;

  return (
    <article className="flex flex-col md:flex-row w-full max-w-[935px] md:h-[600px] lg:h-[700px] bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
      {/* --- [좌측] 이미지 영역 --- */}
      <div className="w-full md:w-[55%] lg:w-[60%] bg-black relative flex items-center justify-center overflow-hidden h-[400px] md:h-full group select-none">
        {/* 슬라이드 트랙 */}
        <div
          className="flex w-full h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {post.images.map((image, index) => (
            <div
              key={image.id || index}
              className="relative w-full h-full flex-shrink-0"
            >
              <Image
                src={image.url}
                alt={`Post content ${index + 1}`}
                fill
                className="object-contain"
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 600px"
              />
            </div>
          ))}
        </div>

        {/* 내비게이션 버튼 & 인디케이터 */}
        {hasMultipleImages && (
          <>
            {/* ⭐️ 이전 버튼 (조건부 렌더링) */}
            {showPrevButton && (
              <button
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full text-white/90 bg-black/20 hover:bg-black/50 backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 drop-shadow-md"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            )}

            {/* ⭐️ 다음 버튼 (조건부 렌더링) */}
            {showNextButton && (
              <button
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full text-white/90 bg-black/20 hover:bg-black/50 backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 drop-shadow-md"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            )}

            {/* 인디케이터 (하단 점) */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
              {post.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                    idx === currentImageIndex
                      ? "bg-white scale-110 opacity-100"
                      : "bg-white/40 hover:bg-white/70 opacity-80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* --- [우측] 정보 영역 (기존과 동일) --- */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col h-full bg-white relative border-l border-gray-100">
        {/* ... 헤더, 댓글 목록, 하단 액션 버튼 등 기존 코드 유지 ... */}
        {/* (편의상 우측 영역 코드는 생략했습니다. 기존 코드 그대로 사용하시면 됩니다.) */}
        <div className="p-4 border-b border-gray-100 flex gap-3 items-start shrink-0">
          <div className="w-9 h-9 rounded-full border border-gray-100 relative overflow-hidden shrink-0">
            <Image
              src={post.author.profileImage || "/default-profile.png"}
              alt={post.author.username}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
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
              className="text-gray-900 hover:text-gray-500 transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="6" cy="12" r="1.5" />
                <circle cx="18" cy="12" r="1.5" />
              </svg>
            </button>
            {isMenuOpen && (
              <div className="absolute top-8 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden flex flex-col text-sm">
                {isAuthor ? (
                  <>
                    <form action={deletePost}>
                      <button
                        type="submit"
                        disabled={isDeleting}
                        className={`w-full text-left px-4 py-3 font-bold border-b border-gray-100 transition-colors ${
                          isDeleting
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-500 hover:bg-gray-50"
                        }`}
                      >
                        {isDeleting ? UI_TEXT.Deleting : UI_TEXT.Delete}
                      </button>
                    </form>
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

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {post.caption && (
            <div className="flex gap-3 mb-6">
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
                <span className="text-gray-900 whitespace-pre-wrap">
                  {post.caption}
                </span>
                <div className="mt-2 text-xs text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          )}
          {post.comments?.length > 0 ? (
            <div className="space-y-4">{/* 댓글 목록 */}</div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
              <span className="mb-1">{UI_TEXT.NoComments}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white mt-auto z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLikeClick}
                disabled={isAuthor || isPending}
                className={`focus:outline-none transition-transform active:scale-90 ${
                  isError ? "animate-pulse" : ""
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill={isLiked ? "#ff3040" : "none"}
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke={isLiked ? "#ff3040" : "currentColor"}
                  className={`w-7 h-7 ${
                    isLiked ? "scale-110" : "text-gray-900 hover:text-gray-600"
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
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
          <div className="font-semibold text-sm text-gray-900 mb-2">
            {UI_TEXT.LikeCount(optimisticState.likeCount)}
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={UI_TEXT.TypeCommentPlaceholder}
              className="w-full text-sm outline-none bg-transparent placeholder-gray-400 py-1 pr-10"
            />
            <button className="absolute right-0 text-blue-500 font-semibold text-sm opacity-60 hover:opacity-100 transition-opacity">
              {UI_TEXT.Post}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
