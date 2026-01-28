"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toggleLikeAction } from "@/features/like/actions";
import { toast } from "sonner";

interface UseLikeProps {
  targetId: string;
  targetType: "POST" | "COMMENT";
  initialIsLiked: boolean;
  initialLikeCount: number;
}

export function useLike({
  targetId,
  targetType,
  initialIsLiked,
  initialLikeCount,
}: UseLikeProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ⭐️ [핵심 1] 사용자의 "마지막 의도"를 저장하는 Ref
  // useState는 렌더링에 반영되는 값이고, 이 Ref는 로직 검증용 최신 값입니다.
  const latestUserIntent = useRef(initialIsLiked);

  const { mutate } = useMutation({
    mutationFn: async (finalIsLiked: boolean) => {
      const result = await toggleLikeAction(null, {
        targetId,
        targetType,
        finalIsLiked, // 서버 액션에서 이 값을 받아 처리하도록 수정 필요
      });

      if (!result.success) {
        throw new Error(result.message || "좋아요 처리에 실패했습니다.");
      }
      return result;
    },

    onSuccess: (result) => {
      // ⭐️ [핵심 2] "서버 응답"이 "사용자의 최신 의도"와 다르면 무시합니다.
      // 즉, 서버가 "좋아요 됐어!"라고 답장을 보냈는데,
      // 그 사이에 사용자가 이미 "취소"를 눌렀다면(Ref가 false라면),
      // 서버 응답으로 UI를 덮어쓰지 않고 무시합니다.
      if (result.data && result.data.isLiked === latestUserIntent.current) {
        setIsLiked(result.data.isLiked);
        setLikeCount(result.data.likeCount);
      } else {
        console.log("⚠️ Stale response ignored: User clicked again.");
      }
    },

    onError: (error) => {
      console.error("Like mutation failed:", error);
      toast.error(error.message);

      // 실패 시 롤백은 Ref도 같이 돌려놔야 합니다.
      setIsLiked((prev) => {
        const rollbackValue = !prev;
        latestUserIntent.current = rollbackValue; // Ref도 롤백 동기화
        return rollbackValue;
      });
      setLikeCount((prev) => (prev ? prev - 1 : prev + 1));
    },
  });

  const toggleLike = () => {
    // [A] 낙관적 업데이트
    const nextIsLiked = !isLiked;

    setIsLiked(nextIsLiked);
    setLikeCount((prev) => (nextIsLiked ? prev + 1 : prev - 1));

    // ⭐️ Ref에 사용자의 최신 의도를 즉시 기록
    latestUserIntent.current = nextIsLiked;

    // [B] 디바운싱
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      // 타이머가 끝났을 때의 상태가 아닌,
      // '현재 Ref에 저장된 최신 의도'를 보냅니다.
      mutate(latestUserIntent.current);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isLiked, likeCount, toggleLike };
}
