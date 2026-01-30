import "server-only";

import { postLikes, commentLikes, posts, comments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createNotification } from "../notification/service";
import { DbClient } from "@/lib/types";
import { runInTransaction } from "@/lib/run-in-transaction";
import { ToggleLikeDTO } from "./validation";
import { ToggleLikeResponse } from "./types";

/**
 * 좋아요 토글 서비스
 * - 게시물(POST) 및 댓글(COMMENT) 좋아요 처리
 * - 비정규화 컬럼(likeCount) 원자적 업데이트
 * - 좋아요 추가 시 알림 생성 로직 포함
 */
export async function toggleLike(
  data: ToggleLikeDTO,
  tx?: DbClient
): Promise<ToggleLikeResponse> {
  const { targetId, targetType, userId, finalIsLiked } = data;

  return await runInTransaction(async (transaction) => {
    let currentLikeCount = 0;
    let newLikeId: string | undefined;

    // -------------------------------------------------------------------
    // [CASE 1] 게시물(POST) 좋아요 처리
    // -------------------------------------------------------------------
    if (targetType === "POST") {
      const existingLike = await transaction.query.postLikes.findFirst({
        where: and(
          eq(postLikes.postId, targetId),
          eq(postLikes.userId, userId)
        ),
      });

      if (finalIsLiked && !existingLike) {
        // 1-1. 좋아요 데이터 삽입
        const [inserted] = await transaction
          .insert(postLikes)
          .values({ postId: targetId, userId })
          .returning();
        newLikeId = inserted.id;

        // 1-2. [비정규화] 게시물 좋아요 카운트 증가
        await transaction
          .update(posts)
          .set({ likeCount: sql`${posts.likeCount} + 1` })
          .where(eq(posts.id, targetId));
      } else if (!finalIsLiked && existingLike) {
        // 1-3. 좋아요 데이터 삭제
        await transaction
          .delete(postLikes)
          .where(
            and(eq(postLikes.postId, targetId), eq(postLikes.userId, userId))
          );

        // 1-4. [비정규화] 게시물 좋아요 카운트 감소
        await transaction
          .update(posts)
          .set({ likeCount: sql`${posts.likeCount} - 1` })
          .where(eq(posts.id, targetId));
      }

      // 1-5. 알림 생성 (좋아요 추가 시에만)
      if (finalIsLiked && newLikeId) {
        const postData = await transaction.query.posts.findFirst({
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
              postLikeId: newLikeId,
            },
            transaction
          );
        }
      }

      // 1-6. 최신 카운트 조회
      const updatedPost = await transaction.query.posts.findFirst({
        where: eq(posts.id, targetId),
        columns: { likeCount: true },
      });
      currentLikeCount = updatedPost?.likeCount ?? 0;

      // -------------------------------------------------------------------
      // [CASE 2] 댓글(COMMENT) 좋아요 처리
      // -------------------------------------------------------------------
    } else {
      const existingLike = await transaction.query.commentLikes.findFirst({
        where: and(
          eq(commentLikes.commentId, targetId),
          eq(commentLikes.userId, userId)
        ),
      });

      if (finalIsLiked && !existingLike) {
        // 2-1. 좋아요 데이터 삽입
        const [inserted] = await transaction
          .insert(commentLikes)
          .values({ commentId: targetId, userId })
          .returning();
        newLikeId = inserted.id;

        // 2-2. [비정규화] 댓글 좋아요 카운트 증가
        await transaction
          .update(comments)
          .set({ likeCount: sql`${comments.likeCount} + 1` })
          .where(eq(comments.id, targetId));
      } else if (!finalIsLiked && existingLike) {
        // 2-3. 좋아요 데이터 삭제
        await transaction
          .delete(commentLikes)
          .where(
            and(
              eq(commentLikes.commentId, targetId),
              eq(commentLikes.userId, userId)
            )
          );

        // 2-4. [비정규화] 댓글 좋아요 카운트 감소
        await transaction
          .update(comments)
          .set({ likeCount: sql`${comments.likeCount} - 1` })
          .where(eq(comments.id, targetId));
      }

      // 2-5. 알림 생성 (댓글 좋아요 추가 시)
      if (finalIsLiked && newLikeId) {
        const commentData = await transaction.query.comments.findFirst({
          where: eq(comments.id, targetId),
          columns: { authorId: true, postId: true },
        });

        if (commentData && commentData.authorId !== userId) {
          await createNotification(
            {
              actorId: userId,
              recipientId: commentData.authorId,
              type: "COMMENT_LIKE",
              postId: commentData.postId,
              commentId: targetId,
              commentLikeId: newLikeId,
            },
            transaction
          );
        }
      }

      // 2-6. 최신 카운트 조회
      const updatedComment = await transaction.query.comments.findFirst({
        where: eq(comments.id, targetId),
        columns: { likeCount: true },
      });
      currentLikeCount = updatedComment?.likeCount ?? 0;
    }

    return {
      isLiked: finalIsLiked,
      likeCount: currentLikeCount,
    };
  }, tx);
}
