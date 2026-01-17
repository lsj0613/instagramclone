import { posts, users } from "@/db/schema";
import { type InferSelectModel } from "drizzle-orm";
import type { Session } from "next-auth";
// 1. 기본 Post 타입 (DB 그대로)
export type Post = InferSelectModel<typeof posts>;

// 2. 기본 User 타입
export type User = InferSelectModel<typeof users>;

// 3. [핵심] 우리가 실제로 쓰는 "작성자 포함 + 날짜 문자열 변환된" 타입
// (일일이 타이핑하지 않고 기존 타입을 상속받아서 수정합니다)
export type PostInfo = Omit<Post, "createdAt"> & {
  createdAt: string; // Date -> string으로 덮어쓰기
  author: Pick<User, "id" | "name" | "username" | "profileImage">; // 필요한 유저 정보만
  images: { url: string; order: number }[]; // 이미지 배열
  
  // 만약 좋아요 여부 같은 추가 필드가 있다면 여기 적기
  isLiked: boolean;
};


export type ActionResponse<T = null> = {
  success: boolean;
  message?: string | null; // 토스트(Toast)나 알림창에 띄울 사용자용 메시지
  data?: T | null; // 성공 시 반환할 데이터 (생성된 객체 등)
  fieldErrors?: Record<string, string[] | undefined>; // Zod 유효성 검사 실패 시 필드별 에러
};


export type SessionUser = Session["user"];