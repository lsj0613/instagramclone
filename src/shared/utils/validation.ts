import { z } from "zod";

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

export const UuidSchema = z
  .string()
  .uuid({ message: "유효하지 않은 ID 형식입니다." });

// ⭐️ [수정] 알림 관리 스키마 (새로운 필드 추가)
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

  // 새로 추가된 연결 필드들
  postLikeId: z.string().uuid().optional(),
  commentLikeId: z.string().uuid().optional(),
  followId: z.string().uuid().optional(),
});

export type ManageNotificationDTO = z.infer<typeof ManageNotificationSchema>;


// ⭐️ [추가] 게시물 조회 DTO
export const GetPostSchema = z.object({
  postId: z.string().uuid(),
  currentUserId: z.string().uuid().optional().nullable(),
});
export type GetPostDTO = z.infer<typeof GetPostSchema>;

// ⭐️ [추가] 게시물 생성 DTO (기존 CreatePostParams 대체)
// 이미지가 Form에서 객체로 넘어오므로, 이를 검증할 서브 스키마 정의
const PostImageSchema = z.object({
  url: z.string().url(),
  publicId : z.string(),
  width: z.number(),
  height: z.number(),
  altText: z.string().optional(),
});

export const CreatePostSchema = z.object({
  authorId: z.string().uuid(),
  caption: z.string().max(2200).optional(),
  locationName: z.string().optional(),
  // 숫자로 변환 (FormData는 모든 게 문자열로 옴)
  latitude: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional()
  ),
  longitude: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().optional()
  ),

  // ⭐️ [핵심] JSON 문자열 파싱 (Preprocess)
  images: z.preprocess((val) => {
    // 1. 이미 배열이면 그대로 둠 (직접 호출 시)
    if (Array.isArray(val)) return val;
    // 2. 문자열이면 JSON 파싱
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return [];
  }, z.array(PostImageSchema)), // 파싱 후 이 스키마로 검증
});
export type CreatePostDTO = z.infer<typeof CreatePostSchema>;

// ⭐️ [추가] 게시물 삭제 DTO
export const DeletePostSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(), // 삭제 요청자
});
export type DeletePostDTO = z.infer<typeof DeletePostSchema>;

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

// 2. 댓글 수정
export const UpdateCommentSchema = z.object({
  commentId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string().min(1),
});
export type UpdateCommentDTO = z.infer<typeof UpdateCommentSchema>;

// 3. 댓글 삭제
export const DeleteCommentSchema = z.object({
  commentId: z.string().uuid(),
  userId: z.string().uuid(),
});
export type DeleteCommentDTO = z.infer<typeof DeleteCommentSchema>;

// 4. 댓글 조회 (무한 스크롤)
export const GetCommentsSchema = z.object({
  postId: z.string().uuid(),
  currentUserId: z.string().uuid().optional().nullable(),
  limit: z.number().default(10),
  cursorId: z.string().uuid().optional(),
});
export type GetCommentsDTO = z.infer<typeof GetCommentsSchema>;

// 5. 대댓글 조회
export const GetRepliesSchema = z.object({
  parentId: z.string().uuid(),
  currentUserId: z.string().uuid().optional().nullable(),
  limit: z.number().default(5),
  cursorId: z.string().uuid().optional(),
});
export type GetRepliesDTO = z.infer<typeof GetRepliesSchema>;

export const GetUserSchema = z.object({
  identifier: z.string(), // userId 또는 username
  by: z.enum(["id", "username"]), // 무엇으로 찾을지
  currentUserId: z.string().uuid().optional().nullable(), // 현재 로그인한 유저 (isOwner 확인용)
});
export type GetUserDTO = z.infer<typeof GetUserSchema>;

export const UpdatePostSchema = z.object({
  postId: z.string().uuid(),
  userId: z.string().uuid(), // 수정 권한 확인용 (작성자 본인인지)
  caption: z.string().max(2200).optional(),
  locationName: z.string().optional(),

  // 좌표 수정도 가능하게 할 경우 (FormData 대비 preprocess 적용)
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