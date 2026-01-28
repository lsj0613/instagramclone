"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useCreateComment } from "@/shared/hooks/use-create-comment";
import { CurrentUserData } from "@/services/user.service";

const commentSchema = z.object({
  // trim() 후 최소 1자 이상이어야 유효함
  content: z.string().trim().min(1, "댓글을 입력해주세요."),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentInputProps {
  postId: string;
  currentUser: CurrentUserData;
}

export default function CommentInput({
  postId,
  currentUser,
}: CommentInputProps) {
  // [LOG] 컴포넌트 렌더링 확인
  console.log("👀 [CommentInput] 컴포넌트 렌더링됨", {
    postId,
    userId: currentUser?.id,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    // watch 제거 (컴파일러 경고 해결)
    formState: { isValid, isSubmitting, errors }, // isValid 사용, errors는 로그용으로 추가
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
    mode: "onChange", // ⭐️ 중요: 입력할 때마다 유효성 검사를 수행하여 isValid를 갱신
  });

  // [LOG] 폼 상태 변경 확인 (입력할 때마다 찍힘)
  console.log("📝 [CommentInput] 폼(Form) 상태:", {
    isValid,
    isSubmitting,
    errors,
  });

  const { mutate, isPending } = useCreateComment({
    postId,
    currentUser,
    onRestoreInput: (failedContent) => {
      // [LOG] 낙관적 업데이트 실패 시 복구 로직 실행 확인
      console.warn(
        "↩️ [CommentInput] 입력 복구(onRestoreInput) 실행됨. 복구할 내용:",
        failedContent
      );
      setValue("content", failedContent);
    },
  });

  // [LOG] 훅 상태 확인
  console.log("🔗 [CommentInput] 훅(Hook) 상태:", { isPending });

  const onSubmit = (data: CommentFormValues) => {
    // [LOG] 제출 핸들러 시작
    console.log("🚀 [CommentInput] 제출(onSubmit) 함수 실행됨. 데이터:", data);

    // 1. 낙관적 UI: 즉시 초기화
    console.log("🧹 [CommentInput] 폼 초기화(reset) 실행");
    reset();

    // 2. 서버 요청
    console.log("📡 [CommentInput] 서버 요청(mutate) 호출");
    mutate(data.content);
  };

  // 버튼 활성화 조건:
  // 1. isValid: 스키마 조건 만족 (공백 제외 1글자 이상)
  // 2. !isSubmitting: 현재 제출 처리 중이 아님 (사실 낙관적이라 짧음)
  const canSubmit = isValid && !isSubmitting;

  // [LOG] 최종 버튼 활성화 상태 확인
  console.log("🔒 [CommentInput] 제출 버튼 활성화 여부:", canSubmit);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white"
    >
      <input
        type="text"
        placeholder="댓글 달기..."
        className="flex-1 text-sm outline-none placeholder:text-gray-400 py-2 bg-transparent"
        autoComplete="off"
        {...register("content")}
      />

      <button
        type="submit"
        disabled={!canSubmit} // isValid 기반으로 비활성화
        className="shrink-0 font-semibold text-sm text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed hover:text-blue-700 transition-colors p-2"
        onClick={() => console.log("🖱️ [CommentInput] 게시 버튼 클릭됨")}
      >
        {/* 낙관적 업데이트라서 로딩바가 보일 틈이 거의 없긴 합니다 */}
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : (
          "게시"
        )}
      </button>
    </form>
  );
}
