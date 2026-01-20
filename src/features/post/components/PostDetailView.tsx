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

// ⭐️ children prop 추가 (댓글 컴포넌트 주입용)
interface PostDetailViewProps {
  post: PostDetailData;
  children?: React.ReactNode;
}

export default function PostDetailView({
  post,
  children,
}: PostDetailViewProps) {
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

  return (
    // ⭐️ 크기 확대: max-w-1200px, h-[85vh] 적용
    <article className="flex flex-col md:flex-row w-full max-w-[1200px] h-[85vh] bg-white border border-gray-300 rounded-xl overflow-hidden shadow-2xl">
      {/* --- [좌측] 이미지 영역 (비율 조정) --- */}
      <div className="w-full md:w-[60%] lg:w-[65%] bg-black relative flex items-center justify-center overflow-hidden h-[50%] md:h-full group select-none">
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
                    <form action={deletePost}>
                      <button
                        type="submit"
                        disabled={isDeleting}
                        className="w-full text-left px-4 py-3 font-bold text-red-500 hover:bg-gray-50 border-b border-gray-100"
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

          {/* ⭐️ children 위치: 여기에 외부에서 주입한 Suspense + CommentList가 렌더링됨 */}
          <div className="flex-1">{children}</div>
        </div>

        {/* 3. 하단 액션 (좋아요 등) - 입력창 삭제됨 */}
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
          <div className="font-semibold text-sm text-gray-900">
            {UI_TEXT.LikeCount(optimisticState.likeCount)}
          </div>
        </div>
      </div>
    </article>
  );
}
