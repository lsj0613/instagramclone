import db from "@/lib/db";
import { posts, postImages, users } from "@/db/schema"; // users 추가
import { and, eq, sql } from "drizzle-orm"; // eq, sql 추가

// 서비스 함수에 전달할 데이터 타입 정의
interface CreatePostServiceParams {
  authorId: string;
  caption: string;
  locationName?: string;
  images: string[];
}

/**
 * 게시물과 이미지를 트랜잭션으로 안전하게 저장하고, 유저의 게시물 개수도 증가시킵니다.
 */
export async function createPostInDB({
  authorId,
  caption,
  locationName,
  images,
}: CreatePostServiceParams) {
  
  return await db.transaction(async (tx) => {
    
    // 1. 게시물(Post) 저장
    const [newPost] = await tx
      .insert(posts)
      .values({
        authorId,
        caption,
        locationName,
      })
      .returning();

    // 2. 이미지(PostImages) 저장
    if (images.length > 0) {
      const imageRecords = images.map((url, index) => ({
        postId: newPost.id,
        url: url,
        order: index,
      }));

      await tx.insert(postImages).values(imageRecords);
    }

    // 3. [NEW] 유저의 postCount + 1 증가 (동시성 문제 방지를 위해 sql 연산자 사용)
    await tx.update(users)
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
      .where(
        and(
          eq(posts.id, postId),
          eq(posts.authorId, userId)
        )
      )
      .returning({ id: posts.id });

    // 삭제된 레코드가 없다면 (이미 삭제되었거나 권한이 없는 경우)
    if (deletedPosts.length === 0) {
      return null;
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