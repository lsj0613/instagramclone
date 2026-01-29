import "server-only";

import db from "@/lib/db";
import { postLikes, commentLikes, posts, comments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createNotification } from "../notification/service";

type TargetType = "POST" | "COMMENT";

interface ToggleLikeDTO {
  targetId: string;
  targetType: TargetType;
  userId: string;
  finalIsLiked: boolean;
}

/**
 * 좋아요 동기화 서비스 (Atomic Update 적용)
 */
export const toggleLikeInDb = async (
  data: ToggleLikeDTO,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any
) => {
  const { targetId, targetType, userId, finalIsLiked } = data;

  const execute = async (dbInstance: typeof tx | typeof db) => {
    // 1. 요청한 상태(finalIsLiked)를 그대로 반환값으로 사용
    const isLiked = finalIsLiked;

    if (targetType === "POST") {
      // [A] 게시물 좋아요 로직
      const existingLike = await dbInstance.query.postLikes.findFirst({
        where: and(
          eq(postLikes.postId, targetId),
          eq(postLikes.userId, userId)
        ),
      });

      if (finalIsLiked && !existingLike) {
        // [CREATE] 좋아요 추가
        const [newLike] = await dbInstance
          .insert(postLikes)
          .values({ postId: targetId, userId: userId })
          .returning();

        // ⭐️ [ATOMIC] 게시물 카운트 +1
        await dbInstance
          .update(posts)
          .set({ likeCount: sql`${posts.likeCount} + 1` })
          .where(eq(posts.id, targetId));

        // [NOTI] 알림 생성
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
      } else if (!finalIsLiked && existingLike) {
        // [DELETE] 좋아요 취소
        await dbInstance
          .delete(postLikes)
          .where(
            and(eq(postLikes.postId, targetId), eq(postLikes.userId, userId))
          );

        // ⭐️ [ATOMIC] 게시물 카운트 -1
        await dbInstance
          .update(posts)
          .set({ likeCount: sql`${posts.likeCount} - 1` })
          .where(eq(posts.id, targetId));
      }

      // [RETURN] 최신 카운트를 posts 테이블에서 직접 가져옴 (매우 빠름)
      const post = await dbInstance.query.posts.findFirst({
        where: eq(posts.id, targetId),
        columns: { likeCount: true },
      });
      return { isLiked, likeCount: post?.likeCount ?? 0 };
    } else {
      // [B] 댓글 좋아요 로직
      const existingLike = await dbInstance.query.commentLikes.findFirst({
        where: and(
          eq(commentLikes.commentId, targetId),
          eq(commentLikes.userId, userId)
        ),
      });

      if (finalIsLiked && !existingLike) {
        // [CREATE]
        const [newLike] = await dbInstance
          .insert(commentLikes)
          .values({ commentId: targetId, userId: userId })
          .returning();

        // ⭐️ [ATOMIC] 댓글 카운트 +1
        await dbInstance
          .update(comments)
          .set({ likeCount: sql`${comments.likeCount} + 1` })
          .where(eq(comments.id, targetId));

        // [NOTI]
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
      } else if (!finalIsLiked && existingLike) {
        // [DELETE]
        await dbInstance
          .delete(commentLikes)
          .where(
            and(
              eq(commentLikes.commentId, targetId),
              eq(commentLikes.userId, userId)
            )
          );

        // ⭐️ [ATOMIC] 댓글 카운트 -1
        await dbInstance
          .update(comments)
          .set({ likeCount: sql`${comments.likeCount} - 1` })
          .where(eq(comments.id, targetId));
      }

      // [RETURN]
      const comment = await dbInstance.query.comments.findFirst({
        where: eq(comments.id, targetId),
        columns: { likeCount: true },
      });
      return { isLiked, likeCount: comment?.likeCount ?? 0 };
    }
  };

  return tx
    ? await execute(tx)
    : await db.transaction(async (newTx) => await execute(newTx));
};
