import "server-only";

import db from "@/lib/db";
import { posts, postImages, users, postLikes } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  CreatePostDTO,
  DeletePostDTO,
  UpdatePostDTO,
} from "@/features/post/validation";
import { ERROR_MESSAGES } from "@/shared/constants";
import { unstable_cache } from "next/cache";
import { DbClient } from "@/lib/types";
import { runInTransaction } from "@/lib/run-in-transaction";

// -------------------------------------------------------------------
// [R] Read Operations (Caching)
// -------------------------------------------------------------------

/**
 * 정적 데이터 조회 (내부 함수)
 */
const _fetchStaticPostData = async (postId: string, tx?: DbClient) => {
  const client = tx || db; // tx가 있으면 사용, 없으면 기본 db 사용
  
  return await client.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedAt)),
    with: {
      author: {
        columns: { id: true, name: true, username: true, profileImage: true },
      },
      images: {
        orderBy: (images, { asc }) => [asc(images.order)],
      },
    },
  });
};

/**
 * 캐시된 정적 데이터 조회
 * 주의: 캐싱은 보통 '커밋된 데이터'를 대상으로 하므로 전역 db 인스턴스를 사용합니다.
 */
const getCachedStaticPost = async (postId: string) => {
  return await unstable_cache(
    async () => {
      const post = await _fetchStaticPostData(postId); // 캐시는 기본 db로 페칭
      if (!post) return null;
      return {
        ...post,
        createdAt: post.createdAt.toISOString(),
      };
    },
    [`post-static-${postId}`],
    {
      tags: [`post-${postId}`],
      revalidate: 86400,
    }
  )();
};

/**
 * 게시물 상세 조회
 */
export const getPostDetail = async (
  { postId, currentUserId }: { postId: string; currentUserId?: string },
  tx?: DbClient // 조회를 트랜잭션 내에서 수행할 수 있도록 추가
) => {
  const client = tx || db;

  // 1. 정적 데이터 가져오기 (캐시 또는 DB)
  // tx가 전달된 경우 캐시를 건너뛰고 직접 DB를 읽는 것이 데이터 정합성 면에서 안전할 수 있음
  const staticData = tx 
    ? await _fetchStaticPostData(postId, tx) 
    : await getCachedStaticPost(postId);

  if (!staticData) return null;

  // 2. 동적 데이터 확인 (좋아요 여부)
  let isLiked = false;
  if (currentUserId) {
    const like = await client.query.postLikes.findFirst({
      where: and(
        eq(postLikes.postId, postId),
        eq(postLikes.userId, currentUserId)
      ),
      columns: { id: true },
    });
    isLiked = !!like;
  }

  const isOwner = currentUserId ? staticData.authorId === currentUserId : false;

  return {
    ...staticData,
    isLiked,
    isOwner,
  };
};

// -------------------------------------------------------------------
// [C/U/D] Write Operations
// -------------------------------------------------------------------

/**
 * 게시물 생성
 */
export async function createPost(data: CreatePostDTO, tx?: DbClient) {
  return await runInTransaction(async (transaction) => {
    // 1. 게시물 본문 생성
    const [newPost] = await transaction
      .insert(posts)
      .values({
        authorId: data.authorId,
        caption: data.caption,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
      })
      .returning();

    if (!newPost) throw new Error("Failed to create post");

    // 2. 이미지 데이터 삽입
    if (data.images && data.images.length > 0) {
      await transaction.insert(postImages).values(
        data.images.map((img, index) => ({
          postId: newPost.id,
          url: img.url,
          publicId: img.publicId,
          width: img.width,
          height: img.height,
          altText: img.altText,
          order: index,
        }))
      );
    }

    // 3. [비정규화] 유저의 게시물 수 증가
    await transaction
      .update(users)
      .set({ postCount: sql`${users.postCount} + 1` })
      .where(eq(users.id, data.authorId));

    return newPost;
  }, tx);
}

/**
 * 게시물 수정
 */
export async function updatePost(data: UpdatePostDTO, tx?: DbClient) {
  const client = tx || db;

  const [updatedPost] = await client
    .update(posts)
    .set({
      caption: data.caption,
      locationName: data.locationName,
      latitude: data.latitude,
      longitude: data.longitude,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(posts.id, data.postId),
        eq(posts.authorId, data.userId),
        isNull(posts.deletedAt)
      )
    )
    .returning();

  if (!updatedPost) throw new Error(ERROR_MESSAGES.POST_NOT_FOUND);

  return updatedPost;
}

/**
 * 게시물 삭제 (Soft Delete)
 */
export async function deletePost(data: DeletePostDTO, tx?: DbClient) {
  return await runInTransaction(async (transaction) => {
    // 1. Soft Delete 수행
    const [deletedPost] = await transaction
      .update(posts)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(posts.id, data.postId),
          eq(posts.authorId, data.userId),
          isNull(posts.deletedAt)
        )
      )
      .returning();

    if (!deletedPost) throw new Error(ERROR_MESSAGES.POST_NOT_FOUND);

    // 2. [비정규화] 유저의 게시물 수 감소
    await transaction
      .update(users)
      .set({ postCount: sql`${users.postCount} - 1` })
      .where(eq(users.id, data.userId));

    return deletedPost;
  }, tx);
}
