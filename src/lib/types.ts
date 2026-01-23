export type ActionResponse<T = null> = {
  success: boolean;
  message?: string | null; // 토스트(Toast)나 알림창에 띄울 사용자용 메시지
  data?: T | null; // 성공 시 반환할 데이터 (생성된 객체 등)
  fieldErrors?: Record<string, string[] | undefined>; // Zod 유효성 검사 실패 시 필드별 에러
  timestamp?: number; // ⭐️ 선택 사항: UX(useEffect 트리거)용
};