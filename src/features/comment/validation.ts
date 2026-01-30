import { UuidSchema } from "@/lib/validation";
import { z } from "zod";

// #region [Schemas]
export const CreateCommentSchema = z.object({
  postId: UuidSchema,
  authorId: UuidSchema,
  content: z
    .string()
    .trim()
    .min(1, "댓글 내용을 입력해주세요.")
    .max(1000, "댓글은 최대 1000자까지 작성 가능합니다."),
  parentId: UuidSchema.optional().nullable(),
});

export const UpdateCommentSchema = z.object({
  commentId: UuidSchema,
  userId: UuidSchema, // 권한 확인용
  content: z.string().trim().min(1, "수정할 내용을 입력해주세요.").max(1000),
});

export const DeleteCommentSchema = z.object({
  commentId: UuidSchema,
  userId: UuidSchema,
});

export const GetCommentsSchema = z.object({
  postId: UuidSchema,
  currentUserId: UuidSchema.optional().nullable(),
  limit: z.number().int().min(1).max(50).default(20),
  cursorId: UuidSchema.optional(),
});

export const GetRepliesSchema = z.object({
  parentId: UuidSchema,
  currentUserId: UuidSchema.optional().nullable(),
  limit: z.number().int().min(1).max(50).default(10),
  cursorId: UuidSchema.optional(),
});
// #endregion

// #region [DTO Types]
export type CreateCommentDTO = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentDTO = z.infer<typeof UpdateCommentSchema>;
export type DeleteCommentDTO = z.infer<typeof DeleteCommentSchema>;
export type GetCommentsDTO = z.infer<typeof GetCommentsSchema>;
export type GetRepliesDTO = z.infer<typeof GetRepliesSchema>;
// #endregion
