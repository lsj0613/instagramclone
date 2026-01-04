"use client";

import { useState, useOptimistic, useTransition } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { IPost } from "@/models/post.model";
import { toggleLikeAction } from "@/actions/LikePost";
import { cn } from "@/lib/utils"; // cn 유틸리티가 있다면 사용, 없다면 템플릿 리터럴로 대체 가능

interface Props {
  post: IPost;
}

export default function PostDetailView({ post }: Props) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isError, setIsError] = useState(false);

  const currentUserId = session?.user?.id;
  const isAuthor = currentUserId === post.author._id;

  // 1. 낙관적 업데이트
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    post.likes,
    (state, userId: string) => {
      return state.includes(userId)
        ? state.filter((id) => id !== userId)
        : [...state, userId];
    }
  );

  const isLiked = currentUserId
    ? optimisticLikes.includes(currentUserId)
    : false;

  // 2. 핸들러
  const handleLikeClick = () => {
    if (!currentUserId || isAuthor) return;

    startTransition(async () => {
      try {
        addOptimisticLike(currentUserId);
        await toggleLikeAction(post._id);
        setIsError(false);
      } catch (error) {
        setIsError(true);
        setTimeout(() => setIsError(false), 500);
      }
    });
  };

  // 이미지 슬라이드 로직
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = post.images.length > 1;
  const handlePrevImage = () =>
    setCurrentImageIndex((p) => (p === 0 ? post.images.length - 1 : p - 1));
  const handleNextImage = () =>
    setCurrentImageIndex((p) => (p === post.images.length - 1 ? 0 : p + 1));

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* 스타일 태그: 애니메이션 정의 */}
      <style jsx>{`
        /* 에러 시 흔들림 */
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

        /* [추가됨] 좋아요 클릭 시 튀어오르는 효과 */
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
        /* isLiked가 true일 때만 적용할 클래스 */
        .animate-like-bounce {
          animation: like-bounce 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>

      <article className="flex flex-col md:flex-row border rounded-lg overflow-hidden bg-white">
        {/* 이미지 영역 (변경 없음) */}
        <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative aspect-square">
          {post.images.length > 0 && (
            <Image
              src={post.images[currentImageIndex]}
              alt="Post image"
              fill
              className="object-contain"
              priority
            />
          )}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 z-10 hover:bg-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 z-10 hover:bg-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="w-full md:w-2/5 p-4 flex flex-col">
          <div className="flex items-center gap-3 pb-4 border-b">
            <span className="font-bold">{post.author.username}</span>
          </div>

          <div className="py-4 flex-grow">
            <p className="text-sm">
              <span className="font-bold mr-2">{post.author.username}</span>
              {post.caption}
            </p>
          </div>

          {/* 하단 좋아요 액션 구역 */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-4 mb-2">
              {!isAuthor && (
                <button
                  onClick={handleLikeClick}
                  disabled={isPending}
                  // 기존 active:scale-125 제거 -> 대신 hover 효과 추가 추천
                  className={`focus:outline-none transition-opacity hover:opacity-70 ${
                    isError ? "animate-shake text-red-500" : ""
                  }`}
                  aria-label="Like"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill={isLiked ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    // 여기 SVG 클래스에 animate-like-bounce 조건부 적용
                    className={`w-7 h-7 transition-colors duration-200 ${
                      isLiked
                        ? "text-red-500 animate-like-bounce"
                        : "text-black hover:text-gray-600"
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
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-black">
                  좋아요 {optimisticLikes.length}개
                </p>
              </div>
              <p className="text-gray-400">
                {new Date(post.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
