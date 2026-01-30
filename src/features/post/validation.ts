import { UuidSchema } from "@/lib/validation";
import { z } from "zod";

// 1. 게시물 이미지 스키마
const PostImageSchema = z.object({
  url: z.string().url("유효한 이미지 URL이 필요합니다."),
  publicId: z.string().min(1, "이미지 식별자가 필요합니다."),
  width: z.number().positive(),
  height: z.number().positive(),
  altText: z.string().optional().nullable(),
});

// 2. 게시물 생성 스키마
export const CreatePostSchema = z.object({
  authorId: UuidSchema,
  caption: z
    .string()
    .trim()
    .max(2200, "설명은 2200자 이내여야 합니다.")
    .optional(),
  locationName: z.string().trim().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  images: z
    .array(PostImageSchema)
    .min(1, "최소 1장 이상의 이미지가 필요합니다.")
    .max(10, "이미지는 최대 10장까지 업로드 가능합니다."),
});

// 3. 게시물 수정 스키마
export const UpdatePostSchema = z.object({
  postId: UuidSchema,
  userId: UuidSchema, // 본인 확인용
  caption: z.string().trim().max(2200).optional(),
  locationName: z.string().trim().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// 4. 게시물 삭제 스키마
export const DeletePostSchema = z.object({
  postId: UuidSchema,
  userId: UuidSchema,
});

// 5. 게시물 상세 조회 스키마
export const GetPostSchema = z.object({
  postId: UuidSchema,
  currentUserId: UuidSchema.optional().nullable(),
});

// DTO 타입 추출
export type CreatePostDTO = z.infer<typeof CreatePostSchema>;
export type UpdatePostDTO = z.infer<typeof UpdatePostSchema>;
export type DeletePostDTO = z.infer<typeof DeletePostSchema>;
export type GetPostDTO = z.infer<typeof GetPostSchema>;
