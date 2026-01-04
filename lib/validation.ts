import { z } from 'zod';

export const PostCreateSchema = z.object({
  caption: z.string().max(2200, "본문은 2200자 이내여야 합니다.").optional(),
  images: z.array(z.string().url("올바른 이미지 URL 형식이어야 합니다."))
    .min(1, "최소 한 장의 이미지가 필요합니다."),
  location: z.string().optional(),
});

// Zod 스키마로부터 타입 추론
export type PostCreateInput = z.infer<typeof PostCreateSchema>;

export const LoginSchema = z.object({
  email: z.string().email("유효한 이메일 형식이 아닙니다."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
});

export const SignupSchema = z.object({
  email: z.string().email("유효한 이메일 형식이 아닙니다."),
  username: z
    .string()
    .min(3, "사용자 이름은 3자 이상이어야 합니다.")
    .max(20, "사용자 이름은 20자 이내여야 합니다.")
    .regex(/^[a-zA-Z0-9_]+$/, "사용자 이름은 영문, 숫자, 밑줄(_)만 포함할 수 있습니다."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
});

export type SignupInput = z.infer<typeof SignupSchema>;