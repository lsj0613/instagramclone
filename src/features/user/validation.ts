import { z } from "zod";
import { UuidSchema } from "@/lib/validation";

export const GetUserSchema = z.object({
  identifier: z.string().min(1, "식별자가 필요합니다."),
  by: z.enum(["id", "username"]),
  currentUserId: UuidSchema.optional().nullable(),
});

export const UpdateUserSchema = z.object({
  userId: UuidSchema,
  name: z
    .string()
    .trim()
    .max(30, "이름은 30자 이내여야 합니다.")
    .optional()
    .nullable(),
  bio: z
    .string()
    .trim()
    .max(150, "소개는 150자 이내여야 합니다.")
    .optional()
    .nullable(),
  profileImage: z
    .string()
    .url("유효한 이미지 URL이 필요합니다.")
    .optional()
    .nullable(),
  isPrivate: z.boolean().default(false),
});

export const DeleteUserSchema = z.object({
  userId: UuidSchema,
});

export const SearchUserSchema = z.object({
  query: z.string().trim().min(1, "검색어를 입력해주세요."),
});

export type GetUserDTO = z.infer<typeof GetUserSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;
export type DeleteUserDTO = z.infer<typeof DeleteUserSchema>;
export type SearchUserDTO = z.infer<typeof SearchUserSchema>;
