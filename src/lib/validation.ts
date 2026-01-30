import { z } from "zod";

// #region 🔐 Auth & Signup (인증)
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
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "사용자 이름은 영문, 숫자, 밑줄(_)만 포함할 수 있습니다."
    ),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
});

export type SignupInput = z.infer<typeof SignupSchema>;
// #endregion

// #region 🆔 Common Types (공통)
export const UuidSchema = z
  .string()
  .uuid({ message: "유효하지 않은 ID 형식입니다." });
// #endregion
