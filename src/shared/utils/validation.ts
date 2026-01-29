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

// #region 🔔 Notifications (알림)
export const ManageNotificationSchema = z.object({
  actorId: z.string().uuid(),
  recipientId: z.string().uuid(),
  type: z.enum([
    "LIKE",
    "COMMENT",
    "FOLLOW",
    "REPLY",
    "COMMENT_LIKE",
    "FOLLOW_REQUEST",
  ]),
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
  postLikeId: z.string().uuid().optional(),
  commentLikeId: z.string().uuid().optional(),
  followId: z.string().uuid().optional(),
});

export type ManageNotificationDTO = z.infer<typeof ManageNotificationSchema>;
// #endregion

// #region 📝 Post (게시물 CRUD)
// ... (여기에 Post 관련 스키마들) ...
export const GetPostSchema = z.object({
  postId: z.string().uuid(),
  currentUserId: z.string().uuid().optional().nullable(),
});
export type GetPostDTO = z.infer<typeof GetPostSchema>;

const PostImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  width: z.number(),
  height: z.number(),
  altText: z.string().optional(),
});

export const CreatePostSchema = z.object({
  authorId: z.string().uuid(),
  caption: z.string().max(2200).optional(),
  locationName: z.string().optional(),
  latitude: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional()
  ),
  longitude: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional()
  ),
  images: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return [];
  }, z.array(PostImageSchema)),
});
export type CreatePostDTO = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
  caption: z.string().max(2200).optional(),
  locationName: z.string().optional(),
  latitude: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional()
  ),
  longitude: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional()
  ),
});
export type UpdatePostDTO = z.infer<typeof UpdatePostSchema>;

export const DeletePostSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(),
});
export type DeletePostDTO = z.infer<typeof DeletePostSchema>;
// #endregion

// #region 💬 Comment (댓글)
export const CreateCommentSchema = z.object({
  postId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z
    .string()
    .min(1, "내용을 입력해주세요")
    .max(500, "댓글은 500자 이내여야 합니다"),
  parentId: z.string().uuid().optional().nullable(),
});
export type CreateCommentDTO = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  commentId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string().min(1),
});
export type UpdateCommentDTO = z.infer<typeof UpdateCommentSchema>;

export const DeleteCommentSchema = z.object({
  commentId: z.string().uuid(),
  userId: z.string().uuid(),
});
export type DeleteCommentDTO = z.infer<typeof DeleteCommentSchema>;

export const GetCommentsSchema = z.object({
  postId: z.string().uuid(),
  currentUserId: z.string().uuid().optional().nullable(),
  limit: z.number().default(10),
  cursorId: z.string().uuid().optional(),
});
export type GetCommentsDTO = z.infer<typeof GetCommentsSchema>;

export const GetRepliesSchema = z.object({
  parentId: z.string().uuid(),
  currentUserId: z.string().uuid().optional().nullable(),
  limit: z.number().default(5),
  cursorId: z.string().uuid().optional(),
});
export type GetRepliesDTO = z.infer<typeof GetRepliesSchema>;
// #endregion

// #region 👤 User (사용자)
export const GetUserSchema = z.object({
  identifier: z.string(),
  by: z.enum(["id", "username"]),
  currentUserId: z.string().uuid().optional().nullable(),
});
export type GetUserDTO = z.infer<typeof GetUserSchema>;

export const UpdateUserSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().max(30, "이름은 30자 이내여야 합니다.").optional(),
  bio: z.string().max(150, "소개는 150자 이내여야 합니다.").optional(),
  profileImage: z.string().optional(),
  isPrivate: z.preprocess((val) => {
    if (typeof val === "string") return val === "true" || val === "on";
    return Boolean(val);
  }, z.boolean().optional()),
});
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;

export const DeleteUserSchema = z.object({
  userId: z.string().uuid(),
});
export type DeleteUserDTO = z.infer<typeof DeleteUserSchema>;
// #endregion


export const SearchUserSchema = z.object({
  query: z.string().trim(), // 공백 제거만 수행 (빈 문자열 체크는 로직에서)
});

export type SearchUserDTO = z.infer<typeof SearchUserSchema>;