"use client";

import { useEffect } from "react";

/**
 * @param isDirty - 폼 수정 여부 (React Hook Form의 formState.isDirty)
 */
export function useExitGuard(isDirty: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;

      // 현대 브라우저에서는 표준에 따라 e.preventDefault()와 returnValue 설정이 필요합니다.
      e.preventDefault();
      // 대부분의 브라우저에서 사용자 정의 메시지는 무시되고 기본 시스템 메시지가 출력됩니다.
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
}
