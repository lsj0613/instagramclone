"use server";

import { revalidatePath } from "next/cache";
import { PostCreateSchema } from "@/shared/utils/validation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createPostInDB, deletePostInDb } from "@/services/post.service";
import db from "@/lib/db";
import { likes, posts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import {
  deleteNotification,
  createNotification,
} from "@/services/notification.service";
import { ActionResponse } from "@/lib/types";
import { ERROR_MESSAGES } from "@/shared/constants"; // ⭐️ 상수 임포트

// ------------------------------------------------------------------
// 1. 게시물 생성 액션
// ------------------------------------------------------------------
export async function createPostAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const session = await auth();
  const currentUser = session?.user;

  if (!currentUser) {
    return {
      success: false,
      message: ERROR_MESSAGES.AUTH_REQUIRED, // [수정] 대문자 키
    };
  }

  const latStr = formData.get("latitude")?.toString();
  const lngStr = formData.get("longitude")?.toString();

  const rawInput = {
    authorId: currentUser.id,
    caption: formData.get("caption")?.toString() || "",
    locationName: formData.get("locationName")?.toString() || undefined,
    latitude: latStr ? parseFloat(latStr) : undefined,
    longitude: lngStr ? parseFloat(lngStr) : undefined,
    images: formData.getAll("images"),
  };

  const validation = PostCreateSchema.safeParse(rawInput);

  if (!validation.success) {
    return {
      success: false,
      message: ERROR_MESSAGES.INVALID_INPUT, // [수정] 대문자 키
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    await createPostInDB(validation.data);

    revalidatePath(`/profile/${session?.user?.username}`);
    revalidatePath("/");
  } catch (error) {
    console.error("Create Post Error:", error);
    return {
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR, // [수정] 대문자 키
    };
  }

  redirect(`/profile/${session?.user?.username}`);
}

// ------------------------------------------------------------------
// 2. 좋아요 토글 액션
// ------------------------------------------------------------------
export async function togglePostLikeAction(postId: string) {
  try {
    return await db.transaction(async (tx) => {
      const authSession = await auth();
      if (!authSession?.user?.id) throw new Error(ERROR_MESSAGES.AUTH_REQUIRED); // [수정]

      const userId = authSession.user.id;

      const postWithLikes = await tx.query.posts.findFirst({
        where: eq(posts.id, postId),
        columns: { authorId: true },
        with: {
          likes: {
            where: eq(likes.userId, userId),
            columns: { userId: true },
          },
        },
      });

      if (!postWithLikes) throw new Error(ERROR_MESSAGES.POST_NOT_FOUND); // [수정]

      if (postWithLikes.authorId === userId) {
        throw new Error(ERROR_MESSAGES.SELF_LIKE_NOT_ALLOWED); // [수정]
      }

      const isLiked = postWithLikes.likes.length > 0;

      if (isLiked) {
        const deletedRows = await tx
          .delete(likes)
          .where(and(eq(likes.userId, userId), eq(likes.postId, postId)))
          .returning();

        if (deletedRows.length > 0) {
          await tx
            .update(posts)
            .set({ likeCount: sql`${posts.likeCount} - 1` })
            .where(eq(posts.id, postId));

          await deleteNotification(
            {
              actorId: userId,
              recipientId: postWithLikes.authorId,
              type: "LIKE",
              postId: postId,
            },
            tx
          );
        }
      } else {
        const insertedRows = await tx
          .insert(likes)
          .values({ userId: userId, postId: postId })
          .onConflictDoNothing()
          .returning();

        if (insertedRows.length > 0) {
          await tx
            .update(posts)
            .set({ likeCount: sql`${posts.likeCount} + 1` })
            .where(eq(posts.id, postId));

          if (postWithLikes.authorId !== userId) {
            await createNotification(
              {
                actorId: userId,
                recipientId: postWithLikes.authorId,
                type: "LIKE",
                postId: postId,
              },
              tx
            );
          }
        }
      }

      revalidatePath(`/post/${postId}`);
      return { success: true };
    });
  } catch (error) {
    console.error("Like toggle transaction error:", error);
    throw new Error(
      error instanceof Error ? error.message : ERROR_MESSAGES.SERVER_ERROR // [수정]
    );
  }
}

// ------------------------------------------------------------------
// 3. 게시물 삭제 액션
// ------------------------------------------------------------------
export async function deletePostAction(
  postId: string,
  prevState: null | ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const session = await auth();
  if (!session || !session.user?.id) {
    return { success: false, message: ERROR_MESSAGES.AUTH_REQUIRED }; // [수정]
  }

  try {
    await deletePostInDb(postId, session.user.id);

    revalidatePath("/");
    revalidatePath(`/profile/${session.user.username}`);
  } catch (error) {
    console.error("[DeletePostAction Error]:", error);

    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage === "POST_NOT_FOUND_OR_UNAUTHORIZED") {
      // 권한 없음 또는 게시물 없음
      return {
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED, // [수정] (또는 POST_NOT_FOUND)
      };
    }

    return {
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR, // [수정]
    };
  }

  redirect(`/profile/${session.user.username}`);
}
