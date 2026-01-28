import "server-only";

import db from "@/lib/db";
import { posts, postImages, postLikes, comments, users } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { cache } from "react";
// ⭐️ DTO 임포트
import { 
  GetPostDTO, 
  CreatePostDTO, 
  DeletePostDTO, 
  UpdatePostDTO
} from "@/shared/utils/validation";
import { ERROR_MESSAGES } from "@/shared/constants";
import { unstable_cache } from "next/cache";

// -------------------------------------------------------------------
// 1. 타입 헬퍼 & 내부 쿼리 빌더
// -------------------------------------------------------------------
const _fetchStaticPostData = async (postId: string) => {
  return await db.query.posts.findFirst({
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
    },
  });
};

// ⭐️ Data Cache 적용 (게시물 수정 시에만 revalidateTag('post-{id}') 하면 됨)
const getCachedStaticPost = async (postId: string) => {
  return await unstable_cache(
    async () => {
      const post = await _fetchStaticPostData(postId);
      if (!post) return null;
      // Date 직렬화
      return {
        ...post,
        createdAt: post.createdAt.toISOString(),
      };
    },
    [`post-static-${postId}`],
    {
      tags: [`post-${postId}`],
      revalidate: 86400, // 24시간 (수정 없으면 하루 동안 유지)
    }
  )();
};

// -------------------------------------------------------------------
// [B] 동적 데이터 (실시간 조회)
// : 좋아요 개수, 댓글 개수, 내 좋아요 여부
// -------------------------------------------------------------------
const getRealtimeInteractions = async (postId: string, userId?: string) => {
  // 1. 카운트 쿼리 (인덱스 타면 매우 빠름)
  const counts = await db
    .select({
      likeCount: sql<number>`count(distinct ${postLikes.id})`,
      commentCount: sql<number>`count(distinct ${comments.id})`,
    })
    .from(posts)
    .leftJoin(postLikes, eq(postLikes.postId, posts.id))
    .leftJoin(comments, eq(comments.postId, posts.id))
    .where(eq(posts.id, postId))
    .groupBy(posts.id);

  const likeCount = Number(counts[0]?.likeCount ?? 0);
  const commentCount = Number(counts[0]?.commentCount ?? 0);

  // 2. 내 좋아요 여부 (userId가 있을 때만)
  let isLiked = false;
  if (userId) {
    const likeExists = await db.query.postLikes.findFirst({
      where: and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)),
      columns: { id: true },
    });
    isLiked = !!likeExists;
  }

  // 3. 내 소유 여부
  // (소유권 확인을 위해 post의 authorId가 필요하므로 여기서는 패스하거나,
  // 위 정적 데이터와 합칠 때 계산합니다.)

  return { likeCount, commentCount, isLiked };
};

// -------------------------------------------------------------------
// [C] 서비스 함수 (정적 + 동적 병합)
// -------------------------------------------------------------------
export const getPostDetail = async ({
  postId,
  currentUserId,
}: {
  postId: string,
  currentUserId? : string
}) => {
  // 1. [병렬 처리] 정적 데이터(캐시)와 동적 데이터(DB)를 동시에 요청
  const [staticData, dynamicData] = await Promise.all([
    getCachedStaticPost(postId),
    getRealtimeInteractions(postId, currentUserId),
  ]);

  if (!staticData) return null;

  // 2. 데이터 병합
  const isOwner = currentUserId ? staticData.authorId === currentUserId : false;

  return {
    ...staticData, // 본문, 이미지, 작성자
    ...dynamicData, // 좋아요 수, 댓글 수, 좋아요 여부
    isOwner, // 소유권
  };
};

export type PostDetailData = NonNullable<Awaited<ReturnType<typeof getPostDetail>>>;

/**
 * 게시물 생성
 */

export async function createPostInDB(
  data: CreatePostDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const performInsert = async (trx: any) => {
    // 1. 게시물 생성
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

    // 4. 합쳐서 반환
    // 클라이언트가 사용하기 편하게 author 객체를 포함시킵니다.
    return {
      ...newPost,
    };
  };

  if (tx) {
    return await performInsert(tx);
  } else {
    return await db.transaction(performInsert);
  }
}

/**
 * 게시물 삭제
 */
export async function deletePostInDb(
  data: DeletePostDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) {
  const dbInstance = tx || db;

  const [deletedPost] = await dbInstance
    .delete(posts)
    .where(and(eq(posts.id, data.postId), eq(posts.authorId, data.userId)))
    .returning(); // 삭제된 객체 반환

  if (!deletedPost) {
    // 권한이 없거나 게시물이 없는 경우 구분
    // (여기서는 단순화를 위해 하나로 처리하거나, 필요 시 select 후 delete 하여 에러 구분 가능)
    throw new Error(ERROR_MESSAGES.POST_NOT_FOUND); 
  }

  return deletedPost;
}

/**
 * 게시물 수정 (Update)
 * - 캡션, 위치 정보만 수정 가능 (이미지는 수정 불가 정책)
 * - postId와 userId(작성자)가 일치해야만 수정됨
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
      updatedAt: new Date(), // 수정 시간 갱신 (선택 사항, DB 자동 설정이면 생략 가능)
    })
    .where(
      and(
        eq(posts.id, data.postId), 
        eq(posts.authorId, data.userId) // ⭐️ 본인 확인 (Security)
      )
    )
    .returning(); // 수정된 객체 반환

  if (!updatedPost) {
    // 업데이트된 행이 없다면 -> 게시물이 없거나, 권한이 없는 것임
    throw new Error(ERROR_MESSAGES.POST_NOT_FOUND); 
  }

  return updatedPost;
}