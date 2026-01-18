import "server-only";

import db from "@/lib/db";
import { likes, posts, postImages, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
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
        where: eq(likes.userId, userId || ""),
        columns: { userId: true },
      },
    },
    // authorId는 posts 테이블의 컬럼이므로 자동으로 포함됩니다.
  });

type RawPostData = NonNullable<Awaited<ReturnType<typeof _getPostQuery>>>;

// ⭐️ [수정] isOwner 필드 추가
export type PostDetailData = Omit<RawPostData, "likes" | "createdAt"> & {
  isLiked: boolean;
  isOwner: boolean; // 👈 추가됨
  createdAt: string;
};

// -------------------------------------------------------------------
// 2. 서비스 함수
// -------------------------------------------------------------------

const _getPostInfo = async (
  postId: string,
  currentUserId?: string | null
): Promise<PostDetailData | null> => {
  try {
    const validation = UuidSchema.safeParse(postId);
    if (!validation.success) {
      console.warn(`[getPostById] Invalid UUID: ${postId}`);
      return null;
    }

    const post = await _getPostQuery(postId, currentUserId ?? "");

    if (!post) {
      return null;
    }

    const { likes: likedRecords, ...postData } = post;

    // ⭐️ [추가] 소유권 계산
    // post.authorId는 Drizzle 쿼리에서 자동으로 가져온 상태입니다.
    const isOwner = currentUserId ? post.authorId === currentUserId : false;

    return {
      ...postData,
      isLiked: likedRecords.length > 0,
      isOwner, // 👈 계산된 값 주입
      createdAt: post.createdAt.toISOString(),
    };
  } catch (error) {
    console.error(`❌ DB Error fetching post ${postId}:`, error);
    return null;
  }
};

export const getPostInfo = cache(_getPostInfo);

// ... (createPostInDB, deletePostInDb 등 나머지 함수는 기존 그대로 유지) ...
export async function createPostInDB({
  authorId,
  caption,
  locationName,
  latitude,
  longitude,
  images,
}: CreatePostParams) {
  return await db.transaction(async (tx) => {
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

    if (!newPost) {
      throw new Error(
        "Failed to create post: Database insert returned no result."
      );
    }

    if (images.length > 0) {
      const imageRecords = images.map((url, index) => ({
        postId: newPost.id,
        url: url,
        order: index,
      }));

      await tx.insert(postImages).values(imageRecords);
    }

    await tx
      .update(users)
      .set({
        postCount: sql`${users.postCount} + 1`,
      })
      .where(eq(users.id, authorId));

    return newPost;
  });
}

export async function deletePostInDb(postId: string, userId: string) {
  return await db.transaction(async (tx) => {
    const deletedPosts = await tx
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.authorId, userId)))
      .returning({ id: posts.id });

    if (deletedPosts.length === 0) {
      throw new Error("POST_NOT_FOUND_OR_UNAUTHORIZED");
    }

    await tx
      .update(users)
      .set({
        postCount: sql`${users.postCount} - 1`,
      })
      .where(eq(users.id, userId));

    return deletedPosts[0];
  });
}
