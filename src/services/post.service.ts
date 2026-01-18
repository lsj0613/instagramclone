import "server-only";

import db from "@/lib/db";
import { posts, postImages, postLikes, comments } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { CreatePostParams, UuidSchema } from "@/shared/utils/validation";
import { ERROR_MESSAGES } from "@/shared/constants";

// -------------------------------------------------------------------
// 1. 타입 헬퍼
// -------------------------------------------------------------------
const _getPostQuery = (postId: string, userId: string) =>
  db.query.posts.findFirst({
    where: eq(posts.id, postId),
    // 게시물 자체의 좋아요/댓글 개수 (Live Count)
    extras: {
      likeCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${postLikes} 
        WHERE post_likes.post_id = ${posts.id}
      )`.as("like_count"),

      commentCount: sql<number>`(
        SELECT count(*)::int 
        FROM ${comments} 
        WHERE comments.post_id = ${posts.id}
      )`.as("comment_count"),
    },
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
        // 필요 시 columns 명시
      },
      likes: {
        where: eq(postLikes.userId, userId || ""),
        columns: { userId: true },
        limit: 1,
      },
      // ⭐️ [추가] 댓글 목록 가져오기
      comments: {
        orderBy: (comments, { desc }) => [desc(comments.createdAt)], // 최신순 정렬
        with: {
          author: {
            columns: {
              id: true,
              username: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

// Drizzle이 자동으로 comments 타입을 추론하여 RawPostData에 포함시킵니다.
type RawPostData = NonNullable<Awaited<ReturnType<typeof _getPostQuery>>>;

export type PostDetailData = Omit<RawPostData, "likes" | "createdAt"> & {
  isLiked: boolean;
  isOwner: boolean;
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

    const { likes: myLikeRecord, ...postData } = post;

    const isOwner = currentUserId ? post.authorId === currentUserId : false;

    return {
      ...postData,
      isLiked: myLikeRecord.length > 0,
      isOwner,
      createdAt: post.createdAt.toISOString(),
      // comments는 이미 postData 안에 포함되어 있으므로 별도 처리 불필요
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
  images, // 이제 string[]이 아니라 { url, width, height ... }[] 타입입니다.
}: CreatePostParams) {
  return await db.transaction(async (tx) => {
    // 1. 게시물(Post) 저장
    const [newPost] = await tx
      .insert(posts)
      .values({
        authorId: authorId!, // 서버 액션에서 반드시 주입해주므로 ! 사용 (타입 단언)
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

    // 2. 이미지(PostImages) 저장 (메타데이터 매핑)
    if (images.length > 0) {
      const imageRecords = images.map((img, index) => ({
        postId: newPost.id,
        url: img.url,
        // ⭐️ 스키마에 추가된 컬럼 매핑
        width: img.width,
        height: img.height,
        altText: img.altText, // 없으면 undefined로 들어감 (DB에서 null 허용 시)
        order: index,
      }));

      await tx.insert(postImages).values(imageRecords);
    }

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
      throw new Error(ERROR_MESSAGES.POST_NOT_FOUND);
    }

    return deletedPosts[0];
  });
}
