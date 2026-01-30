"use server";

import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/safe-action";
import { createComment, deleteComment, updateComment } from "./service";
import {
  CreateCommentSchema,
  DeleteCommentSchema,
  UpdateCommentSchema,
} from "@/features/comment/validation";

export const createCommentAction = createSafeAction(
  CreateCommentSchema.omit({ authorId: true }),
  async (data, user) => {
    const newComment = await createComment({
      ...data,
      authorId: user.id,
    });

    revalidatePath(`/post/${data.postId}`);
    return newComment;
  }
);

export const deleteCommentAction = createSafeAction(
  DeleteCommentSchema.pick({ commentId: true }),
  async (data, user) => {
    const deletedComment = await deleteComment({
      commentId: data.commentId,
      userId: user.id,
    });

    revalidatePath(`/post/${deletedComment.postId}`);
    return deletedComment;
  }
);

export const updateCommentAction = createSafeAction(
  UpdateCommentSchema.pick({ commentId: true, content: true }),
  async (data, user) => {
    const updatedComment = await updateComment({
      ...data,
      userId: user.id,
    });

    revalidatePath(`/post/${updatedComment.postId}`);
    return updatedComment;
  }
);
