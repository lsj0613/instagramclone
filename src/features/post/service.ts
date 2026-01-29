import "server-only";

import db from "@/lib/db";
import { posts, postImages, postLikes, users } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm"; // ⭐️ isNull 추가
import {
  CreatePostDTO,
  DeletePostDTO,
  UpdatePostDTO,
} from "@/shared/utils/validation";
import { ERROR_MESSAGES } from "@/shared/constants";
import { unstable_cache } from "next/cache";

// -------------------------------------------------------------------
// 1. 내부 쿼리 빌더
// -------------------------------------------------------------------

const _fetchStaticPostData = async (postId: string) => {
  return await db.query.posts.findFirst({
    where: and(
      eq(posts.id, postId),
      isNull(posts.deletedAt) // ⭐️ 삭제된 게시물 제외
    ),
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
    },
  });
};

const getCachedStaticPost = async (postId: string) => {
  return await unstable_cache(
    async () => {
      const post = await _fetchStaticPostData(postId);
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

// -------------------------------------------------------------------
// [C] 서비스 함수 (최적화 버전)
// -------------------------------------------------------------------

export const getPostDetail = async ({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId?: string;
}) => {
  // 1. 정적 데이터(캐시) 가져오기
  const staticData = await getCachedStaticPost(postId);
  if (!staticData) return null;

  // 2. 동적 데이터 확인 (내 좋아요 여부만 확인하면 됨)
  // ⭐️ likeCount, commentCount는 이미 staticData 안에 들어있음 (DB컬럼)
  let isLiked = false;
  if (currentUserId) {
    const like = await db.query.postLikes.findFirst({
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

export type PostDetailData = NonNullable<
  Awaited<ReturnType<typeof getPostDetail>>
>;

/**
 * 게시물 생성
 */
export async function createPostInDB(
  data: CreatePostDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const performInsert = async (trx: any) => {
    // 1. 게시물 생성 (likeCount, commentCount 기본값 0)
    const [newPost] = await trx
      .insert(posts)
      .values({
        authorId: data.authorId,
        caption: data.caption,
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
      })
      .returning();

    if (!newPost) {
      throw new Error("Failed to create post");
    }

    // 2. 이미지 생성
    if (data.images.length > 0) {
      const imageRecords = data.images.map((img, index) => ({
        postId: newPost.id,
        url: img.url,
        publicId: img.publicId,
        width: img.width,
        height: img.height,
        altText: img.altText,
        order: index,
      }));

      await trx.insert(postImages).values(imageRecords);
    }

    // ⭐️ 3. 유저의 postCount + 1 증가
    await trx
      .update(users)
      .set({ postCount: sql`${users.postCount} + 1` })
      .where(eq(users.id, data.authorId));

    return { ...newPost };
  };

  if (tx) {
    return await performInsert(tx);
  } else {
    return await db.transaction(performInsert);
  }
}

/**
 * 게시물 삭제 (Soft Delete)
 */
export async function deletePostInDb(
  data: DeletePostDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  // ⭐️ 1. UPDATE로 Soft Delete 처리
  const [deletedPost] = await dbInstance
    .update(posts)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(posts.id, data.postId),
        eq(posts.authorId, data.userId),
        isNull(posts.deletedAt) // 이미 삭제된 것 제외
      )
    )
    .returning();

  if (!deletedPost) {
    throw new Error(ERROR_MESSAGES.POST_NOT_FOUND);
  }

  // ⭐️ 2. 유저의 postCount - 1 감소 (선택 사항이지만 일관성을 위해 추천)
  // (트랜잭션 처리가 이상적이나, 여기선 dbInstance 그대로 사용)
  await dbInstance
    .update(users)
    .set({ postCount: sql`${users.postCount} - 1` })
    .where(eq(users.id, data.userId));

  return deletedPost;
}

/**
 * 게시물 수정
 */
export async function updatePostInDB(
  data: UpdatePostDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  const [updatedPost] = await dbInstance
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
        isNull(posts.deletedAt) // ⭐️ 삭제된 게시물 수정 불가
      )
    )
    .returning();

  if (!updatedPost) {
    throw new Error(ERROR_MESSAGES.POST_NOT_FOUND);
  }

  return updatedPost;
}
