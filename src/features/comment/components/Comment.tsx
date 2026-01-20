"use client";

import Image from "next/image";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/shared/utils/utils";

interface Author {
  id: string;
  username: string;
  profileImage: string | null;
}

interface CommentProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    author: Author;
    likeCount: number;
    replyCount: number;
    isLiked: boolean;
    isOwner: boolean;
  };
}

export default function CommentItem({ comment }: CommentProps) {
  const {
    author,
    content,
    createdAt,
    likeCount,
    replyCount,
    isLiked,
    isOwner,
  } = comment;

  // 현업에서는 날짜 포맷팅을 위한 유틸리티 함수를 별도로 관리합니다.
  const formattedDate = new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));

  return (
    <div className="group flex gap-3 py-3 px-4 transition-colors hover:bg-gray-50/50">
      {/* 아바타 영역 */}
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
        <Image
          src={author.profileImage || "/default-profile.png"}
          alt={author.username}
          fill
          className="object-cover"
        />
      </div>

      {/* 본문 및 액션 영역 */}
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              {author.username}
            </span>
            <span className="text-xs text-gray-400" suppressHydrationWarning>
              {formattedDate}
            </span>
          </div>

          {/* 본인일 경우 혹은 관리자용 옵션 버튼 */}
          <button className="rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100">
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {content}
        </p>

        {/* 하단 버튼 바 */}
        <div className="mt-1 flex items-center gap-4">
          <button
            className={cn(
              "flex items-center gap-1 text-xs transition-colors hover:text-red-500",
              isLiked ? "text-red-500" : "text-gray-500"
            )}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            <span>{likeCount > 0 && likeCount}</span>
          </button>

          <button className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-blue-500">
            <MessageCircle className="h-4 w-4" />
            <span>{replyCount > 0 && replyCount}</span>
          </button>

          {/* 답글 달기 버튼 (기능은 나중에 구현) */}
          <button className="text-xs font-semibold text-gray-500 hover:underline">
            답글 달기
          </button>
        </div>
      </div>
    </div>
  );
}
