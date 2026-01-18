"use server";

import { revalidatePath } from "next/cache";
import { PostCreateSchema } from "@/shared/utils/validation";
import { redirect } from "next/navigation";
import { createPostInDB, deletePostInDb } from "@/services/post.service";
import db from "@/lib/db";
import { posts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import {
  deleteNotification,
  createNotification,
} from "@/services/notification.service";
import { ActionResponse } from "@/lib/types";
import { ERROR_MESSAGES, ROUTES } from "@/shared/constants"; // ⭐️ 상수 임포트
import { getCurrentUser } from "@/services/user.service";

// ------------------------------------------------------------------
// 1. 게시물 생성 액션
// ------------------------------------------------------------------
export async function createPostAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      message: ERROR_MESSAGES.AUTH_REQUIRED, 
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

    revalidatePath(ROUTES.PROFILE(currentUser.username));
    revalidatePath(ROUTES.HOME);
  } catch (error) {
    console.error("Create Post Error:", error);
    return {
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR, // [수정] 대문자 키
    };
  }

  redirect(ROUTES.PROFILE(currentUser.username));
}

// ------------------------------------------------------------------
// 2. 좋아요 토글 액션
// ------------------------------------------------------------------
export async function togglePostLikeAction(postId: string) {
  
}

// ------------------------------------------------------------------
// 3. 게시물 삭제 액션
// ------------------------------------------------------------------
export async function deletePostAction(
  postId: string,
  prevState: null | ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const currentUser = await getCurrentUser();
  if (!currentUser)
    return { success: false, message: ERROR_MESSAGES.AUTH_REQUIRED };

  try {
    await deletePostInDb(postId, currentUser.id);

    revalidatePath("/");
    revalidatePath(`/profile/${currentUser.username}`);
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

  redirect(`/profile/${currentUser.username}`);
}
