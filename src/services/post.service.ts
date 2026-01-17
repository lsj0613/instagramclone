import "server-only"; // 👈 맨 위에 이거 한 줄이면 끝

import db from "@/lib/db";
import { likes, posts, postImages, users } from "@/db/schema"; // users 추가
import { and, eq, sql } from "drizzle-orm"; // eq, sql 추가
import { cache } from "react";
import { CreatePostParams, UuidSchema } from "@/shared/utils/validation";

// -------------------------------------------------------------------
// 1. 타입 헬퍼
// -------------------------------------------------------------------
const _getPostQuery = (postId: string, userId: string) =>
  db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      author: {
        columns: {
          id: true,
          name: true,
          username: true,
          profileImage: true,
        },
      },
      images: {
        orderBy: (postImages, { asc }) => [asc(postImages.order)],
      },
      likes: {
        // ⭐️ 전달받은 userId가 있으면 그 유저의 좋아요만 가져오고,
        // 없으면(비로그인) 빈 문자열로 비교해 아무것도 안 가져옵니다.
        where: eq(likes.userId, userId || ""),
        columns: { userId: true },
      },
    },
  });

type RawPostData = NonNullable<Awaited<ReturnType<typeof _getPostQuery>>>;

export type PostDetailData = Omit<RawPostData, "likes" | "createdAt"> & {
  isLiked: boolean;
  createdAt: string;
};

// -------------------------------------------------------------------
// 2. 서비스 함수
// -------------------------------------------------------------------

/**
 * postId와 currentUserId를 인수로 받아 post 정보를 반환합니다.
 */
const _getPostInfo = async (
  postId: string,
  currentUserId?: string | null
): Promise<PostDetailData | null> => {
  try {
    // 1. 유효성 검사 (Zod)
    const validation = UuidSchema.safeParse(postId);
    if (!validation.success) {
      console.warn(`[getPostById] Invalid UUID: ${postId}`);
      return null;
    }

    // 2. DB 조회
    // userId가 없으면(비로그인) 빈 문자열("")을 넘겨서 좋아요가 없는 것으로 처리
    const post = await _getPostQuery(postId, currentUserId ?? "");

    if (!post) {
      return null;
    }

    // 3. 데이터 가공
    const { likes: likedRecords, ...postData } = post;

    return {
      ...postData,
      isLiked: likedRecords.length > 0, // 내 ID로 조회된 기록이 있으면 True
      createdAt: post.createdAt.toISOString(),
    };
  } catch (error) {
    console.error(`❌ DB Error fetching post ${postId}:`, error);
    return null;
  }
};

// ⭐️ Cache 적용
// 이제 postId와 currentUserId 조합으로 캐싱됩니다.
export const getPostInfo = cache(_getPostInfo);

/**
 * 트랜잭션 내부에서 게시물과 이미지를 저장하고 유저의 postCount를 증가시킵니다.
 */
export async function createPostInDB({
  authorId,
  caption,
  locationName,
  latitude,
  longitude,
  images,
}: CreatePostParams) {
  return await db.transaction(async (tx) => {
    // 1. 게시물(Post) 저장
    const [newPost] = await tx
      .insert(posts)
      .values({
        authorId,
        caption,
        locationName,
        latitude,
        longitude,
      })
      .returning();

    // ⭐️ [추가됨] 게시물 생성 실패 시 에러 발생 (트랜잭션 롤백 트리거)
    if (!newPost) {
      throw new Error(
        "Failed to create post: Database insert returned no result."
      );
    }

    // 2. 이미지(PostImages) 저장
    if (images.length > 0) {
      const imageRecords = images.map((url, index) => ({
        postId: newPost.id,
        url: url,
        order: index,
      }));

      await tx.insert(postImages).values(imageRecords);
    }

    // 3. 유저의 postCount + 1 증가
    await tx
      .update(users)
      .set({
        postCount: sql`${users.postCount} + 1`,
      })
      .where(eq(users.id, authorId));

    return newPost;
  });
}

/**
 * 특정 사용자의 게시물을 삭제하는 비즈니스 로직
 * @param postId 삭제할 게시물 ID
 * @param userId 삭제를 요청한 유저 ID (권한 검증용)
 */

export async function deletePostInDb(postId: string, userId: string) {
  return await db.transaction(async (tx) => {
    // 1. 게시물 삭제 실행 (삭제 권한 확인 포함)
    const deletedPosts = await tx
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.authorId, userId)))
      .returning({ id: posts.id });

    // 삭제된 레코드가 없다면 (이미 삭제되었거나 권한이 없는 경우)
    if (deletedPosts.length === 0) {
      throw new Error("POST_NOT_FOUND_OR_UNAUTHORIZED");
    }

    // 2. 해당 유저의 postCount를 1 감소 (Atomic Decrement)
    // sql 템플릿 리터럴을 사용하여 DB 레벨에서 연산을 수행합니다.
    await tx
      .update(users)
      .set({
        postCount: sql`${users.postCount} - 1`,
      })
      .where(eq(users.id, userId));

    // 삭제된 게시물 정보 반환
    return deletedPosts[0];
  });
}
