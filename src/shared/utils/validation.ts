import { z } from 'zod';

export const PostCreateSchema = z.object({
  // 1. 작성자 ID: 클라이언트가 보내지 않고 서버가 주입하므로 optional 처리
  authorId: z.string().uuid().optional(),

  // 2. 텍스트 데이터
  caption: z.string().max(2200, "내용은 2200자 이내여야 합니다."),
  locationName: z.string().optional(), // 빈 값 허용
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // 3. 이미지 데이터: 문자열 배열 -> 객체 배열로 변경 (⭐️ 핵심 수정)
  // 이제 URL 뿐만 아니라 DB 최적화에 필요한 width, height를 함께 검증합니다.
  images: z
    .array(
      z.object({
        url: z.string().url("유효하지 않은 이미지 URL입니다."),
        width: z.number().int().positive("너비는 양수여야 합니다."),
        height: z.number().int().positive("높이는 양수여야 합니다."),
        altText: z.string().optional(), // 접근성 텍스트 (선택)
      })
    )
    .min(1, "이미지는 최소 1장 필요합니다."),
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