"use client";

import {
  useMutation,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { createCommentAction } from "@/features/comment/actions";
import { toast } from "sonner"; // 혹은 alert
import { CommentWithAuthor } from "@/features/comment/service";
import { CurrentUserData } from "@/features/user/service";

// 1. 무한 스크롤 데이터 구조 정의 (TanStack Query가 관리하는 형태)
interface CommentsInfiniteData {
  pages: {
    comments: CommentWithAuthor[]; // 각 페이지별 댓글 리스트
    nextCursor?: string; // 다음 페이지 커서
  }[];
  pageParams: (string | undefined)[];
}

interface UseCreateCommentProps {
  postId: string;
  currentUser: CurrentUserData;
  onRestoreInput?: (content: string) => void; // 실패 시 입력창 복구용 함수
}

export function useCreateComment({
  postId,
  currentUser,
  onRestoreInput,
}: UseCreateCommentProps) {
  const queryClient = useQueryClient(); // 2. 캐시 관리자 소환

  return useMutation({
    // 4. 실제 서버 요청 함수 (비동기)
    mutationFn: async (content: string) => {
      console.log(`[서버요청] 🚀 서버로 데이터 전송 시작 (내용: ${content})`);
      const result = await createCommentAction(null, { postId, content });
      console.log("[서버요청] ✅ 서버로부터 응답 받음:", result);
      return result;
    },

    // ----------------------------------------------------------------
    // 5. ⭐️ [핵심] 낙관적 업데이트: 서버로 떠나기 전에 미리 UI 조작
    // ----------------------------------------------------------------
    onMutate: async (content) => {
      console.log("[낙관적업데이트] 1. 작업 시작");

      // (A) 진행 중인 쿼리 멈춤: 데이터가 꼬이지 않게 기존 조회 요청 취소
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      console.log(
        "[낙관적업데이트] 2. 데이터 꼬임 방지를 위해 기존 조회 요청 취소함"
      );

      // (B) 스냅샷 저장: 만약 실패하면 되돌리기 위해 현재 상태를 백업
      const previousComments = queryClient.getQueryData<CommentsInfiniteData>([
        "comments",
        postId,
      ]);
      console.log(
        "[낙관적업데이트] 3. 실패 시 복구를 위한 백업(스냅샷) 저장 완료:",
        previousComments ? "기존 데이터 있음" : "기존 데이터 없음"
      );

      // (C) 가짜 댓글(Hologram) 생성: 화면에 당장 보여줄 임시 데이터
      const optimisticComment: CommentWithAuthor = {
        id: `temp-${Date.now()}`, // 임시 ID (나중에 진짜로 교체됨)
        content: content,
        createdAt: new Date(), // 현재 시간
        updatedAt: new Date(),
        authorId: currentUser.id,
        author: {
          // 현재 로그인한 내 정보
          id: currentUser?.id || "me",
          username: currentUser?.username || "Me",
          profileImage: currentUser?.profileImage || "/default-profile.png",
        },
        likeCount: 0,
        isLiked: false,
        postId: postId,
        parentId: null,
        replyCount: 0,
        isOwner: true,
        deletedAt: null,
      };
      console.log(
        "[낙관적업데이트] 4. 화면에 먼저 보여줄 가짜 댓글 생성:",
        optimisticComment
      );

      // (D) 캐시 수술 집도: 기존 데이터를 수정해서 가짜 댓글 끼워넣기
      console.log("[낙관적업데이트] 5. 캐시 데이터 강제 수정 시작");
      queryClient.setQueryData<CommentsInfiniteData>(
        ["comments", postId],
        (oldData) => {
          if (!oldData) {
            console.log(
              "[낙관적업데이트] ⚠️ 기존 데이터가 없어 수정을 건너뜁니다."
            );
            return oldData;
          }

          console.log("[낙관적업데이트] ⚡️ 캐시에 가짜 댓글 주입 중...");
          // 불변성을 지키며 새로운 객체 생성
          return {
            ...oldData,
            pages: oldData.pages.map((page, index) => {
              // "첫 번째 페이지(index === 0)"의 "맨 앞"에 추가
              if (index === 0) {
                return {
                  ...page,
                  comments: [optimisticComment, ...page.comments],
                };
              }
              return page; // 나머지 페이지는 건드리지 않음
            }),
          };
        }
      );
      console.log(
        "[낙관적업데이트] 6. UI 반영 완료 (사용자에게는 이미 등록된 것처럼 보임)"
      );

      // (E) 컨텍스트 반환: onError에서 쓸 수 있게 백업 데이터 등을 넘김
      return { previousComments };
    },

    // ----------------------------------------------------------------
    // 6. 실패 처리: 롤백 및 복구
    // ----------------------------------------------------------------
    onError: (err, newContent, context) => {
      console.error("[에러발생] ❌ 댓글 작성 실패:", err);

      // (A) 롤백: 아까 저장해둔 스냅샷(previousComments)으로 캐시를 되돌림
      if (context?.previousComments) {
        console.log(
          "[에러발생] ↺ 롤백 실행: 저장해둔 백업 데이터로 복구합니다"
        );
        queryClient.setQueryData(
          ["comments", postId],
          context.previousComments
        );
      } else {
        console.log("[에러발생] ⚠️ 롤백할 백업 데이터가 없습니다.");
      }

      // (B) 입력창 복구: 사용자가 썼던 글을 다시 입력창에 꽂아줌
      if (onRestoreInput) {
        console.log(`[에러발생] ⌨️ 입력창 내용 복구: "${newContent}"`);
        onRestoreInput(newContent);
      }

      // (C) 알림: 사용자에게 실패 사실 고지
      toast.error("댓글 등록에 실패했습니다. (내용이 복구되었습니다)");
    },

    // ----------------------------------------------------------------
    // 7. 마무리: 정합성 맞추기
    // ----------------------------------------------------------------
    onSettled: () => {
      console.log("[요청종료] 🏁 트랜잭션 끝. 데이터 정합성 맞추기 시작");
      // 성공하든 실패하든, 서버에서 진짜 최신 데이터를 다시 가져와서 확실하게 동기화
      // (이 과정에서 가짜 ID인 temp-123이 진짜 UUID로 교체됨)
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      console.log("[요청종료] 🔄 최신 데이터 재요청(새로고침) 예약됨");
    },
  });
}
