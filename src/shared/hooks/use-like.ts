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

  // 1. Mutation 정의
  const { mutate } = useMutation({
    // ⭐️ 핵심: mutate() 호출 시 넘겨준 인자(boolean)를 여기서 받습니다.
    mutationFn: async (finalIsLiked: boolean) => {
      // (선택 사항) 여기서 finalIsLiked 값을 이용해
      // 서버로 "좋아요(true)"인지 "취소(false)"인지 명시적으로 보낼 수도 있습니다.
      // 현재는 토글 액션이므로 호출 자체에 집중합니다.


      const result = await toggleLikeAction(null, {
        targetId,
        targetType,
        finalIsLiked,
      });

      if (!result.success) {
        console.log("serverAction failed");
        throw new Error(result.message || "좋아요 처리에 실패했습니다.");
      }

      console.log("serverAction success");
      return result;
    },

    onSuccess: (result) => {
      // 서버 데이터가 있으면 그것으로 덮어씌워 확실한 동기화
      if (result.data) {
        setIsLiked(result.data.isLiked);
        setLikeCount(result.data.likeCount);
      }
    },

    onError: (error) => {
      // variables는 mutate(finalIsLiked)에서 넘긴 값입니다.
      // 즉, 실패 시 '어떤 상태로 가려다 실패했는지' 알 수 있습니다.
      console.error("Like mutation failed:", error);
      toast.error(error.message);

      // ⭐️ 롤백: 실패했으므로 UI를 반대로 되돌림
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => (prev ? prev - 1 : prev + 1));
    },
  });

  // 2. 핸들러
  const toggleLike = () => {
    // [A] 낙관적 업데이트 (UI 즉시 변경)
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikeCount((prev) => (nextIsLiked ? prev + 1 : prev - 1));
    console.log(`Optimistic Update: ${nextIsLiked}`);

    // [B] 디바운싱
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      // ⭐️ 300ms 뒤에 실행될 때, '지금 클릭했을 때의 의도(nextIsLiked)'를
      // mutate의 인자로 고정해서 넘깁니다.
      console.log("Debounce 끝, mutate 호출");
      mutate(nextIsLiked);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isLiked, likeCount, toggleLike };
}
