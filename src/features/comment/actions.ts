"use server";

import { auth } from "@/lib/auth";
import { ActionResponse } from "@/lib/types";
import {
  createComment,
  deleteComment,
  updateComment,
} from "@/services/comment.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// 스키마 정의
const CreateCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(1, "댓글 내용을 입력해주세요."),
  parentId: z.string().uuid().optional(),
});

const UpdateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().trim().min(1, "수정할 내용을 입력해주세요."),
  postId: z.string().uuid(), // Revalidation을 위해 필요
});

// 1. 댓글 생성 액션
export async function createCommentAction(
  prevState: ActionResponse | null,
  formData: FormData
) {
  // 1) 인증 체크
  const session = await auth();
  if (!session?.user) return { error: "로그인이 필요합니다." };

  // 2) 입력값 검증
  const rawData = {
    postId: formData.get("postId"),
    content: formData.get("content"),
    parentId: formData.get("parentId") || undefined,
  };

  const validation = CreateCommentSchema.safeParse(rawData);
  if (!validation.success) return { error: "입력값이 올바르지 않습니다." };

  try {
    // 3) 서비스 호출 (DB 저장)
    await createComment({
      postId: validation.data.postId,
      authorId: session.user.id,
      content: validation.data.content,
      parentId: validation.data.parentId,
    });

    // 4) ⭐️ [핵심] 성공 후 여기서 페이지 갱신 (Controller의 역할)
    revalidatePath(`/post/${validation.data.postId}`, "page");

    return { success: true };
  } catch (error) {
    console.error("Create Comment Error:", error);
    return { error: "댓글 작성 중 오류가 발생했습니다." };
  }
}

// 2. 댓글 삭제 액션
export async function deleteCommentAction(commentId: string) {
  const session = await auth();
  if (!session?.user) return { error: "로그인이 필요합니다." };

  try {
    // 서비스 호출 (삭제된 댓글 데이터 반환받음)
    const deletedComment = await deleteComment({
      commentId,
      userId: session.user.id,
    });

    // ⭐️ [핵심] 삭제된 댓글이 속해있던 게시물 페이지 갱신
    // 서비스에서 deletedComment를 리턴해줬기 때문에 postId를 알 수 있음.
    revalidatePath(`/post/${deletedComment.postId}`, "page");

    return { success: true };
  } catch (error) {
    console.error("Delete Comment Error:", error);
    return { error: "댓글 삭제 권한이 없거나 실패했습니다." };
  }
}

// 3. 댓글 수정 액션
export async function updateCommentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "로그인이 필요합니다." };

  const rawData = {
    commentId: formData.get("commentId"),
    content: formData.get("content"),
    postId: formData.get("postId"), // Form에서 hidden input으로 받아야 함
  };

  const validation = UpdateCommentSchema.safeParse(rawData);
  if (!validation.success) return { error: "입력값이 올바르지 않습니다." };

  try {
    await updateComment({
      commentId: validation.data.commentId,
      userId: session.user.id,
      content: validation.data.content,
    });

    // ⭐️ [핵심] 페이지 갱신
    revalidatePath(`/post/${validation.data.postId}`, "page");

    return { success: true };
  } catch (error) {
    return { error: "댓글 수정에 실패했습니다." };
  }
}



import { getComments } from "@/services/comment.service"; // 기존에 만드신 서비스 함수
import { getCurrentUser } from "@/services/user.service";
import { ROUTES } from "@/shared/constants";
import { redirect } from "next/navigation";

export async function getCommentsForQuery({
  postId,
  pageParam,
}: {
  postId: string;
  pageParam?: string;
}) {
  // 1. 세션 확인
  const currentUser = await getCurrentUser();

  // 2. 미들웨어가 있지만, 스크롤 도중 세션 만료된 경우를 대비해 튕겨냄 (Double Safety)
  if (!currentUser) {
    redirect(ROUTES.LOGIN);
  }

  const LIMIT = 20;

  // 3. 데이터 조회 (이제 currentUser.id는 확실히 존재함)
  const data = await getComments({
    postId,
    currentUserId: currentUser.id,
    cursorId: pageParam,
    limit: LIMIT,
  });

  const nextCursor = data.length === LIMIT ? data[data.length - 1].id : null;

  return {
    data,
    nextCursor,
  };
}