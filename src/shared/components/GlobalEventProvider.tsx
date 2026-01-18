"use client";

import { useEffect } from "react";

export function GlobalEventProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      // 업로드 존 내부에서의 드롭은 허용해야 하므로, 전역 차단만 수행
      // 실제 업로드 컴포넌트에서 e.stopPropagation()을 사용해 제어합니다.
      e.preventDefault();
    };

    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);

    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  return <>{children}</>;
}
