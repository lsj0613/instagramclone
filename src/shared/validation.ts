import { z } from 'zod';

export const PostCreateSchema = z.object({
  authorId: z.string().uuid(), // UUID 형식인지 검증
  caption: z.string(),
  locationName: z.string().optional(), // undefined 허용
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // 이미지 URL 배열 (최소 1장 이상 필수라면 .min(1) 추가)
  images: z.array(z.string().url()).min(1, "이미지는 최소 1장 필요합니다."),
});

// 2. ⭐️ 핵심: 스키마로부터 TypeScript 타입 자동 추출
// 이제 interface를 따로 만들 필요가 없습니다.
export type CreatePostParams = z.infer<typeof PostCreateSchema>;


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

export const UuidSchema = z
  .string()
  .uuid({ message: "유효하지 않은 ID 형식입니다." });