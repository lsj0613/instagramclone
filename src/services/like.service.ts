import "server-only";

import db from "@/lib/db";
import { postLikes, commentLikes, posts, comments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createNotification } from "@/services/notification.service";

type TargetType = "POST" | "COMMENT";

// 1. DTO 인터페이스 정의 (finalIsLiked 추가)
interface ToggleLikeDTO {
  targetId: string;
  targetType: TargetType;
  userId: string;
  finalIsLiked: boolean; // ⭐️ 추가됨: 클라이언트가 원하는 최종 상태
}

/**
 * 좋아요 동기화 서비스
 * 클라이언트가 요청한 finalIsLiked 상태와 DB 상태를 일치시킵니다.
 */
export const toggleLikeInDb = async (
  data: ToggleLikeDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) => {
  const { targetId, targetType, userId, finalIsLiked } = data;

  const execute = async (dbInstance: typeof tx | typeof db) => {
    // 반환할 상태 변수 (요청한 상태로 초기화)
    const isLiked = finalIsLiked;

    if (targetType === "POST") {
      // [A] 게시물 좋아요 로직
      const existingLike = await dbInstance.query.postLikes.findFirst({
        where: and(
          eq(postLikes.postId, targetId),
          eq(postLikes.userId, userId)
        ),
      });

      // 1. 좋아요를 켜야 하는데, 데이터가 없을 때 -> [생성]
      if (finalIsLiked && !existingLike) {
        const [newLike] = await dbInstance
          .insert(postLikes)
          .values({ postId: targetId, userId: userId })
          .returning();

        // 알림 생성 로직
        const postData = await dbInstance.query.posts.findFirst({
          where: eq(posts.id, targetId),
          columns: { authorId: true },
        });

        if (postData && postData.authorId !== userId) {
          await createNotification(
            {
              actorId: userId,
              recipientId: postData.authorId,
              type: "LIKE",
              postId: targetId,
              postLikeId: newLike.id,
            },
            dbInstance
          );
        }
      }
      // 2. 좋아요를 꺼야 하는데, 데이터가 있을 때 -> [삭제]
      else if (!finalIsLiked && existingLike) {
        await dbInstance
          .delete(postLikes)
          .where(
            and(eq(postLikes.postId, targetId), eq(postLikes.userId, userId))
          );
      }
      // 3. 이미 상태가 일치하면 아무 작업도 하지 않음 (Idempotent)

      // [공통] 최신 개수 카운트
      const countResult = await dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(postLikes)
        .where(eq(postLikes.postId, targetId));

      return { isLiked, likeCount: Number(countResult[0]?.count ?? 0) };
    } else {
      // [B] 댓글 좋아요 로직
      const existingLike = await dbInstance.query.commentLikes.findFirst({
        where: and(
          eq(commentLikes.commentId, targetId),
          eq(commentLikes.userId, userId)
        ),
      });

      // 1. 좋아요를 켜야 하는데, 데이터가 없을 때 -> [생성]
      if (finalIsLiked && !existingLike) {
        const [newLike] = await dbInstance
          .insert(commentLikes)
          .values({ commentId: targetId, userId: userId })
          .returning();

        // 알림 생성 로직
        const commentData = await dbInstance.query.comments.findFirst({
          where: eq(comments.id, targetId),
          columns: { authorId: true, postId: true },
        });

        if (commentData && commentData.authorId !== userId) {
          await createNotification(
            {
              actorId: userId,
              recipientId: commentData.authorId,
              type: "COMMENT_LIKE",
              commentId: targetId,
              postId: commentData.postId,
              commentLikeId: newLike.id,
            },
            dbInstance
          );
        }
      }
      // 2. 좋아요를 꺼야 하는데, 데이터가 있을 때 -> [삭제]
      else if (!finalIsLiked && existingLike) {
        await dbInstance
          .delete(commentLikes)
          .where(
            and(
              eq(commentLikes.commentId, targetId),
              eq(commentLikes.userId, userId)
            )
          );
      }

      // [공통] 최신 개수 카운트
      const countResult = await dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(commentLikes)
        .where(eq(commentLikes.commentId, targetId));

      return { isLiked, likeCount: Number(countResult[0]?.count ?? 0) };
    }
  };

  return tx
    ? await execute(tx)
    : await db.transaction(async (newTx) => await execute(newTx));
};
