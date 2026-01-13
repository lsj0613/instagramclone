"use server";

import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { likes, posts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm"; // ⭐️ sql 임포트 필수!
import { createNotification, deleteNotification } from "@/lib/data/notification";

export async function togglePostLikeAction(postId: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. 인증 확인
      const authSession = await auth();
      if (!authSession?.user?.id) throw new Error("인증이 필요합니다.");
      const userId = authSession.user.id;

      // 2. 게시물 및 기존 좋아요 여부 조회
      const postWithLikes = await tx.query.posts.findFirst({
        where: eq(posts.id, postId),
        columns: {
          authorId: true,
        },
        with: {
          likes: {
            where: eq(likes.userId, userId),
            columns: { userId: true }, 
          }
        },
      });

      if (!postWithLikes) throw new Error("게시물을 찾을 수 없습니다.");
      
      if (postWithLikes.authorId === userId) {
         throw new Error("본인의 게시물에는 좋아요를 누를 수 없습니다.");
      }

      const isLiked = postWithLikes.likes.length > 0;

      if (isLiked) {
        // ▼▼▼ [취소 로직] ▼▼▼
        const deletedRows = await tx
          .delete(likes)
          .where(
            and(
              eq(likes.userId, userId),
              eq(likes.postId, postId)
            )
          )
          .returning();

        // 실제로 삭제된 경우에만 카운트 감소 및 알림 삭제
        if (deletedRows.length > 0) {
          // 1. 게시물 좋아요 숫자 -1 (Atomic Decrement)
          await tx.update(posts)
            .set({ 
              likeCount: sql`${posts.likeCount} - 1` // ⭐️ SQL 레벨 연산
            })
            .where(eq(posts.id, postId));

          // 2. 알림 삭제
          await deleteNotification({
            actorId: userId,
            recipientId: postWithLikes.authorId,
            type: "LIKE",
            postId: postId,
          }, tx);
        }

      } else {
        // ▼▼▼ [추가 로직] ▼▼▼
        const insertedRows = await tx
          .insert(likes)
          .values({
            userId: userId,
            postId: postId,
          })
          .onConflictDoNothing()
          .returning();

        // 실제로 추가된 경우에만 카운트 증가 및 알림 전송
        if (insertedRows.length > 0) {
          // 1. 게시물 좋아요 숫자 +1 (Atomic Increment)
          await tx.update(posts)
            .set({ 
              likeCount: sql`${posts.likeCount} + 1` // ⭐️ SQL 레벨 연산
            })
            .where(eq(posts.id, postId));

          // 2. 알림 생성
          // (내 글에 내가 좋아요 누른 경우는 알림 안 보내는 게 국룰)
          if (postWithLikes.authorId !== userId) {
             await createNotification({
               actorId: userId,
               recipientId: postWithLikes.authorId,
               type: "LIKE",
               postId: postId,
             }, tx);
          }
        }
      }

      // 3. 캐시 갱신
      // 경로 앞에 슬래시(/)가 있어야 안전합니다.
      revalidatePath(`/post/${postId}`);
      
      return { success: true };
    });

  } catch (error) {
    console.error("Like toggle transaction error:", error);
    throw new Error(error.message || "작업 처리 중 문제가 발생했습니다.");
  }
}