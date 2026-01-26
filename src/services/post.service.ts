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

// -------------------------------------------------------------------
// 1. 타입 헬퍼 & 내부 쿼리 빌더
// -------------------------------------------------------------------

// 내부적으로 사용할 쿼리 빌더 (외부 노출 X)
const _buildPostQuery = (postId: string, userId?: string | null) =>
  db.query.posts.findFirst({
    where: eq(posts.id, postId),
    extras: {
      likeCount: sql<number>`(
        SELECT count(*)::int 
        FROM post_likes -- ⭐️ ${postLikes} 대신 실제 테이블명 사용
        WHERE post_likes.post_id = ${posts.id}
      )`.as("like_count"),

      commentCount: sql<number>`(
        SELECT count(*)::int 
        FROM comments -- ⭐️ ${comments} 대신 실제 테이블명 사용
        WHERE comments.post_id = ${posts.id}
      )`.as("comment_count"),

      // ⭐️ 수정된 부분
      isLiked: sql<boolean>`EXISTS (
        SELECT 1 FROM post_likes 
        WHERE post_likes.post_id = ${posts.id} 
        AND post_likes.user_id = ${
          userId ?? "00000000-0000-0000-0000-000000000000"
        }::uuid
      )`.as("is_liked"),
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
      },
      comments: {
        // 댓글 미리보기용 (최신순 3개 정도만 가져오거나 하는 등 최적화 가능)
        limit: 3,
        orderBy: (comments, { desc }) => [desc(comments.createdAt)],
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

type RawPostData = NonNullable<Awaited<ReturnType<typeof _buildPostQuery>>>;

// 가공된 반환 데이터 타입
export type PostDetailData = Omit<RawPostData, "createdAt"> & {
  createdAt: string;
  isOwner: boolean; // 작성자 본인 여부
};

// -------------------------------------------------------------------
// 2. 서비스 함수 (DTO 적용)
// -------------------------------------------------------------------

// 내부 함수: 캐싱을 위해 분리
const _getPostInfo = async (
  data: GetPostDTO
): Promise<PostDetailData | null> => {
  // DTO 검증은 Action/HOF 레벨에서 이미 수행되었다고 가정하지만,
  // 서비스 안전을 위해 내부 로직 내에서 UUID 검증이 필요하다면 수행
  // 여기서는 이미 Valid한 UUID가 들어온다고 봅니다.

  const post = await _buildPostQuery(data.postId, data.currentUserId);

  if (!post) {
    return null;
  }

  // 작성자 본인 여부 확인
  const isOwner = data.currentUserId 
    ? post.authorId === data.currentUserId 
    : false;

  return {
    ...post,
    isOwner,
    createdAt: post.createdAt.toISOString(),
  };
};

// ⭐️ 캐싱 적용 (React Cache)
// 객체(DTO)를 인자로 받으면 cache가 제대로 동작하지 않을 수 있으므로(참조값 문제),
// cache wrapper는 primitive 타입으로 풀어서 받는 것이 안전합니다.
// 하지만 여기서는 DTO 패턴 유지를 위해 일단 감싸되, 호출 시 주의가 필요합니다.
// (현업 팁: cache key를 확실히 하기 위해 id만 받는 래퍼를 따로 두기도 함)
export const getPostInfo = cache(_getPostInfo);


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