import { UuidSchema } from "@/lib/validation";
import z from "zod";

// shared/utils/validation.ts (기존 DTO 유지 및 추가)
export type MarkAsReadDTO = {
  notificationId: string;
  userId: string;
};

export const GetNotificationsSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional().nullable(),
});
export type GetNotificationsDTO = z.infer<typeof GetNotificationsSchema>;

// shared/utils/validation.ts
export const ManageNotificationSchema = z.object({
  actorId: UuidSchema,
  recipientId: UuidSchema,
  type: z.enum([
    "LIKE",
    "COMMENT",
    "FOLLOW",
    "REPLY",
    "COMMENT_LIKE",
    "FOLLOW_REQUEST",
  ]),
  // 특정 이벤트를 식별하기 위한 선택적 ID들
  postId: UuidSchema.optional(),
  commentId: UuidSchema.optional(),
  postLikeId: UuidSchema.optional(),
  commentLikeId: UuidSchema.optional(),
  followId: UuidSchema.optional(),
});

export type ManageNotificationDTO = z.infer<typeof ManageNotificationSchema>;
