"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useDebouncedAction } from "@/shared/hooks/use-like"; // 앞서 만든 훅 경로
import { cn } from "@/shared/utils/cn"; // shadcn/ui 등의 클래스 병합 유틸 (없으면 생략 가능)

interface LikeButtonProps {
  targetId: string;
  targetType: "POST" | "COMMENT";
  initialIsLiked: boolean;
  initialLikeCount: number;
  className?: string; // 스타일 커스텀용
}

interface LikeState {
  isLiked: boolean;
  likeCount: number;
}

export default function LikeButton({
  targetId,
  targetType,
  initialIsLiked,
  initialLikeCount,
  className,
}: LikeButtonProps) {
  // 1. 실제 상태 (Server Action 성공 후 동기화될 상태)
  // useOptimistic은 base state가 필요하므로 useState로 관리
  const [state, setState] = useState<LikeState>({
    isLiked: initialIsLiked,
    likeCount: initialLikeCount,
  });

  // 2. 낙관적 상태 (UI에 즉시 반영될 상태)
  const [optimisticState, addOptimistic] = useOptimistic(
    state,
    (currentState, newIsLiked: boolean) => ({
      isLiked: newIsLiked,
      likeCount: newIsLiked
        ? currentState.likeCount + (currentState.isLiked ? 0 : 1)
        : currentState.likeCount - (currentState.isLiked ? 1 : 0),
    })
  );

  const [, startTransition] = useTransition();

  // 3. 디바운싱된 서버 요청
  // 300ms 동안 추가 클릭이 없으면 마지막 상태만 서버로 전송
  const debouncedToggle = useDebouncedAction(async (finalIsLiked: boolean) => {
    try {
      const result = await toggleLikeAction(targetId, targetType, finalIsLiked);

      // 서버 응답이 오면 실제 상태(Base State) 업데이트
      if (result.success) {
        setState({
          isLiked: result.data.isLiked,
          likeCount: result.data.likeCount,
        });
      }
    } catch (error) {
      console.error("Like Action Failed:", error);
      // 에러 시 롤백은 setState를 호출하지 않음으로써 초기 상태 유지 (혹은 별도 에러 처리)
    }
  }, 300);

  // 4. 핸들러
  const handleToggle = () => {
    const nextIsLiked = !optimisticState.isLiked;

    // 4-1. 즉시 UI 업데이트 (낙관적)
    startTransition(() => {
      addOptimistic(nextIsLiked);
    });

    // 4-2. 서버 요청 예약 (디바운싱)
    debouncedToggle(nextIsLiked);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <button
          onClick={handleToggle}
          className={`focus:outline-none transition-transform active:scale-125 ${
            optimisticState.isLiked
              ? "text-red-500"
              : "text-gray-900 hover:text-gray-600"
          }`}
        >
          {optimisticState.isLiked ? (
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
      </div>

      {/* 좋아요 숫자 표시 (옵션: 버튼 옆이나 아래에 배치 가능하도록 분리) */}
      {/* 이 컴포넌트 내부에서 숫자를 그릴지, 부모에서 그릴지는 선택 사항입니다. */}
      {/* 여기서는 편의상 UI 텍스트 업데이트를 위해 아래 텍스트를 부모 컴포넌트에서 대체하거나, */}
      {/* 이 컴포넌트가 count prop을 받아 렌더링하도록 할 수 있습니다. */}
    </div>
  );
}

// 헬퍼: 좋아요 개수 표시용 컴포넌트 (PostDetailView 하단에서 사용)
export function LikeCountText({ count }: { count: number }) {
  return (
    <div className="font-semibold text-sm text-gray-900 mt-3">
      좋아요 {count.toLocaleString()}개
    </div>
  );
}
