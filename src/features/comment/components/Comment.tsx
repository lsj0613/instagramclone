"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, MoreHorizontal } from "lucide-react";
import { cn } from "@/shared/utils/utils";
import { CommentWithAuthor } from "@/services/comment.service";

export default function CommentItem({
  comment,
}: {
  comment: CommentWithAuthor;
}) {
  const {
    author,
    content,
    createdAt,
    likeCount,
    replyCount,
    isLiked,
    isOwner,
  } = comment;

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  // 날짜 포맷
  const timeAgo = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(createdAt));

  const handleLike = () => {
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 200);
  };

  const handleDelete = () => {
    if (confirm("정말 삭제하시겠습니까?")) {
      console.log("Delete comment");
    }
    setIsOptionsOpen(false);
  };

  const handleReport = () => {
    alert("신고가 접수되었습니다.");
    setIsOptionsOpen(false);
  };

  return (
    <>
      <div className="group relative flex w-full gap-3 py-2 px-4">
        {/* 1. 프로필 이미지 */}
        <div className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full border border-gray-100">
          <Image
            src={author.profileImage || "/default-profile.png"}
            alt={author.username}
            fill
            className="object-cover"
          />
        </div>

        {/* 2. 콘텐츠 영역 (Flex-1) */}
        <div className="flex flex-1 flex-col gap-1">
          {/* [Top Line] 유저네임 + 본문 + 좋아요 아이콘 */}
          <div className="flex justify-between items-start gap-2">
            {/* 텍스트 영역: text-sm (Line Height: 20px) */}
            <div className="text-sm leading-5 text-gray-900 break-all pt-px">
              <span className="mr-2 cursor-pointer font-semibold text-black hover:opacity-70">
                {author.username}
              </span>
              <span className="whitespace-pre-wrap">{content}</span>
            </div>

            {/* 좋아요 아이콘: 높이 16px (h-4) */}
            {/* 계산: (LineHeight 20px - Icon 16px) / 2 = 2px Margin Top */}
            {/* pt-[1px] 보정을 고려하여 mt-[2px] 적용 -> 시각적 중앙 정렬 */}
            <div className="shrink-0 mt-[2px]">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center justify-center transition-transform",
                  isLikeAnimating && "scale-125"
                )}
                aria-label="좋아요"
              >
                {isLiked ? (
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                ) : (
                  <Heart className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* [Bottom Line] 메타데이터: 시간 · 좋아요 수 · 답글 달기 · 더보기(...) */}
          {/* items-center: 모든 요소를 수직 중앙(Cross Axis Center)에 배치 */}
          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium min-h-[16px]">
            {/* Hydration Error 방지 */}
            <span suppressHydrationWarning>{timeAgo}</span>

            {likeCount > 0 && <span>좋아요 {likeCount}개</span>}

            <button className="hover:text-gray-900">답글 달기</button>

            {/* 점 세개 아이콘: '답글 달기' 바로 옆, 같은 라인에 배치 */}
            <button
              onClick={() => setIsOptionsOpen(true)}
              className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 flex items-center -translate-y-0.5"
            >
              <MoreHorizontal className="h-3 w-3 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {/* 답글 보기 버튼 */}
          {replyCount > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <div className="h-px w-8 -translate-y-0.5 bg-gray-300" />
              <button className="text-xs font-semibold text-gray-500 hover:text-gray-900">
                답글 {replyCount}개 보기
              </button>
              <div className="h-px w-8 -translate-y-0.5 bg-gray-300" />
            </div>
          )}
        </div>
      </div>

      {/* 3. 옵션 모달 */}
      {isOptionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsOptionsOpen(false)}
          />
          <div className="relative w-full max-w-xs overflow-hidden rounded-xl bg-white text-center shadow-2xl animate-in zoom-in-95 duration-200">
            {isOwner ? (
              <>
                <button
                  className="w-full border-b border-gray-100 p-3.5 text-sm font-bold text-red-500 hover:bg-gray-50 active:bg-gray-100"
                  onClick={handleDelete}
                >
                  삭제
                </button>
                <button
                  className="w-full border-b border-gray-100 p-3.5 text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                  onClick={() => alert("수정 기능 연결 필요")}
                >
                  수정
                </button>
              </>
            ) : (
              <button
                className="w-full border-b border-gray-100 p-3.5 text-sm font-bold text-red-500 hover:bg-gray-50 active:bg-gray-100"
                onClick={handleReport}
              >
                신고
              </button>
            )}
            <button
              className="w-full p-3.5 text-sm text-gray-900 hover:bg-gray-50 active:bg-gray-100"
              onClick={() => setIsOptionsOpen(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </>
  );
}
