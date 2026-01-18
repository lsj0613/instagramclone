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
  const [isPending, startTransition] = useTransition();
  const [isError, setIsError] = useState(false);

  // ... (useActionState 등 기존 로직 유지) ...
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

  const isAuthor = post.isOwner; // authorId -> author.id 주의

  // ... (낙관적 업데이트 및 좋아요 핸들러 기존 로직 유지) ...
  const [optimisticState, setOptimisticState] = useOptimistic(
    { isLiked: post.isLiked, likeCount: post.likeCount },
    (state, newIsLiked: boolean) => ({
      isLiked: newIsLiked,
      likeCount: state.likeCount + (newIsLiked ? 1 : -1),
    })
  );

  const isLiked = optimisticState.isLiked; // currentUser check는 위에서 했거나 렌더링 시 처리

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

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = post.images.length > 1;
  const handlePrevImage = () =>
    setCurrentImageIndex((p) => (p === 0 ? post.images.length - 1 : p - 1));
  const handleNextImage = () =>
    setCurrentImageIndex((p) => (p === post.images.length - 1 ? 0 : p + 1));

  // ⭐️ 배경 div 제거하고 article만 반환
  return (
    <>
      <style jsx>{`
        /* ... 기존 스타일 유지 ... */
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-4px);
          }
          75% {
            transform: translateX(4px);
          }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
        @keyframes like-bounce {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.2);
          }
          50% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-like-bounce {
          animation: like-bounce 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.1s ease-out forwards;
        }
      `}</style>

      <article className="flex flex-col md:flex-row w-full max-w-[935px] md:h-[600px] lg:h-[700px] bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
        {/* ... 내부 내용은 기존과 동일 ... */}
        {/* --- [좌측] 이미지 영역 --- */}
        <div className="w-full md:w-[55%] lg:w-[60%] bg-black relative flex items-center justify-center overflow-hidden h-[400px] md:h-full">
          {/* ... 이미지 슬라이더 로직 ... */}
          {post.images.length > 0 && (
            <div className="relative w-full h-full">
              <Image
                src={
                  post.images.find((image) => image.order === currentImageIndex)
                    ?.url || ""
                }
                alt="Post content"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 600px"
              />
            </div>
          )}
          {hasMultipleImages && (
            <>
              {/* 버튼들... */}
              <button
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1.5 shadow-md hover:bg-white transition-all z-10"
              >
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1.5 shadow-md hover:bg-white transition-all z-10"
              >
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                {post.images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      idx === currentImageIndex ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* --- [우측] 정보 및 액션 영역 --- */}
        <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col h-full bg-white relative">
          {/* 1. 헤더 */}
          <div className="p-4 border-b border-gray-100 flex gap-3 items-start shrink-0">
            <div className="w-10 h-10 rounded-full border border-gray-200 relative overflow-hidden shrink-0">
              <Image
                src={post.author.profileImage || "/default-profile.png"}
                alt={post.author.username}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-col">
                <Link
                  href={`/profile/${post.author.username}`}
                  className="font-bold text-sm text-gray-900 hover:opacity-70 leading-none inline-block"
                >
                  {post.author.username}
                </Link>
                {/* post.author.name 등 나머지 정보 */}
              </div>
              {/* 캡션 등 */}
              {post.caption && (
                <div className="text-sm leading-5 text-gray-900 whitespace-pre-wrap mt-2">
                  {post.caption}
                </div>
              )}
              <div className="mt-2 text-[10px] text-gray-500 uppercase tracking-wide font-medium">
                {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
            {/* 메뉴 버튼 및 로직... */}
            <div className="relative shrink-0 ml-1" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-900 hover:text-gray-500 transition-colors p-1"
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
              {isMenuOpen && (
                <div className="absolute top-8 right-0 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden flex flex-col text-sm animate-fade-in ring-1 ring-black ring-opacity-5">
                  {/* 메뉴 항목들... (기존 코드 그대로) */}
                  {isAuthor ? (
                    <>
                      <form action={deletePost}>
                        <button
                          type="submit"
                          disabled={isDeleting}
                          className={`w-full text-left px-4 py-3 font-bold border-b border-gray-100 transition-colors ${
                            isDeleting
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-500 hover:bg-gray-50 active:bg-gray-100"
                          }`}
                        >
                          {isDeleting ? (
                            <span className="flex items-center gap-2">
                              {UI_TEXT.Deleting}
                            </span>
                          ) : (
                            UI_TEXT.Delete
                          )}
                        </button>
                      </form>
                      <button className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100">
                        {UI_TEXT.Edit}
                      </button>
                    </>
                  ) : (
                    <button className="w-full text-left px-4 py-3 text-red-500 font-bold border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100">
                      {UI_TEXT.Report}
                    </button>
                  )}
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left px-4 py-3 text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                  >
                    {UI_TEXT.Cancel}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. 댓글 영역 */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="text-gray-400 text-sm text-center mt-10">
              {UI_TEXT.NoComments}
            </div>
          </div>

          {/* 3. 하단 액션 버튼 */}
          <div className="p-4 border-t border-gray-100 bg-white mt-auto">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-4">
                {!isAuthor && (
                  <button
                    onClick={handleLikeClick}
                    disabled={isPending}
                    className={`focus:outline-none transform transition-transform active:scale-90 ${
                      isError ? "animate-shake" : ""
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill={isLiked ? "#ff3040" : "none"}
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke={isLiked ? "#ff3040" : "currentColor"}
                      className={`w-7 h-7 ${
                        isLiked
                          ? "animate-like-bounce"
                          : "text-gray-900 hover:text-gray-600 transition-colors"
                      }`}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                  </button>
                )}
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
                {!isAuthor && (
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
                )}
              </div>
              <div className="font-semibold text-sm text-gray-900">
                {UI_TEXT.LikeCount(optimisticState.likeCount)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center">
              <svg
                className="w-6 h-6 text-gray-900 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <input
                type="text"
                placeholder={UI_TEXT.TypeCommentPlaceholder}
                className="grow text-sm outline-none bg-transparent placeholder-gray-500"
              />
              <button className="text-blue-500 font-semibold text-sm opacity-50 cursor-default hover:opacity-100">
                {UI_TEXT.Post}
              </button>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
