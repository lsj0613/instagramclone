"use server";

import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/safe-action"; // 🛠️ 마법의 도구
import {
  createComment,
  deleteComment,
  updateComment,
} from "@/services/comment.service"; // 👨‍🍳 요리사 (서비스)
import {
  CreateCommentSchema,
  DeleteCommentSchema,
  UpdateCommentSchema,
} from "@/shared/utils/validation"; // 📜 레시피 (스키마)

// ----------------------------------------------------------------------
// 1. 댓글 생성 액션
// ----------------------------------------------------------------------

// 💡 Action용 스키마: 클라이언트는 authorId를 보내지 않습니다. (서버에서 주입)
// 기존 Schema에서 authorId만 쏙 빼고(.omit) 입력받습니다.
const CreateCommentActionSchema = CreateCommentSchema.omit({ authorId: true });

export const createCommentAction = createSafeAction(
  CreateCommentActionSchema,
  async (data, user) => {
    // 1. 서비스 호출
    const newComment = await createComment({
      ...data, // postId, content, parentId
      authorId: user.id, // ⭐️ user는 safe-action이 찾아줌
    });

    // 2. 페이지 갱신
    revalidatePath(`/post/${data.postId}`);

    // 3. 결과 반환
    return newComment;
  }
);

// ----------------------------------------------------------------------
// 2. 댓글 삭제 액션
// ----------------------------------------------------------------------

// 💡 Action용 스키마: 클라이언트는 commentId만 보냅니다.
// userId는 제외하고(.pick) 입력받습니다.
const DeleteCommentActionSchema = DeleteCommentSchema.pick({ commentId: true });

export const deleteCommentAction = createSafeAction(
  DeleteCommentActionSchema,
  async (data, user) => {
    // 1. 서비스 호출
    // (삭제된 댓글 정보를 반환받아야 postId를 알 수 있음)
    const deletedComment = await deleteComment({
      commentId: data.commentId,
      userId: user.id, // 본인 확인용
    });

    // 2. 페이지 갱신
    // (삭제된 댓글이 있던 게시물 페이지 갱신)
    revalidatePath(`/post/${deletedComment.postId}`);

    // 3. 결과 반환
    return deletedComment;
  }
);

// ----------------------------------------------------------------------
// 3. 댓글 수정 액션
// ----------------------------------------------------------------------

// 💡 Action용 스키마: commentId와 content만 입력받습니다.
const UpdateCommentActionSchema = UpdateCommentSchema.pick({
  commentId: true,
  content: true,
});

export const updateCommentAction = createSafeAction(
  UpdateCommentActionSchema,
  async (data, user) => {
    // 1. 서비스 호출
    const updatedComment = await updateComment({
      commentId: data.commentId,
      content: data.content,
      userId: user.id,
    });

    // 2. 페이지 갱신
    revalidatePath(`/post/${updatedComment.postId}`);

    // 3. 결과 반환
    return updatedComment;
  }
);
