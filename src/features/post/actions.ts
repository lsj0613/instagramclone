"use server";

import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/safe-action"; // 🛡️ 마법의 도구
import { createPostInDB, deletePostInDb, updatePostInDB } from "./service";
import {
  CreatePostSchema,
  DeletePostSchema,
  UpdatePostSchema,
} from "@/shared/utils/validation";
import { ROUTES } from "@/shared/constants";
import { redirect } from "next/navigation";

// ------------------------------------------------------------------
// 1. 게시물 생성 액션
// ------------------------------------------------------------------

// 💡 Action용 스키마: authorId는 서버에서 주입하므로 제외
const CreatePostActionSchema = CreatePostSchema.omit({ authorId: true });

export const createPostAction = createSafeAction(
  CreatePostActionSchema,
  async (data, user) => {
    // 1. 서비스 호출
    // (formData 파싱, 타입 변환은 safe-action과 Zod가 이미 다 끝냄)
    const newPost = await createPostInDB({
      ...data,
      authorId: user.id, // 안전하게 주입된 user 사용
    });

    // 2. 페이지 갱신
    revalidatePath(ROUTES.HOME);
    revalidatePath(ROUTES.PROFILE(user.username));

    redirect(ROUTES.PROFILE(user.username));
    // ⭐️ 3. 결과 반환 (redirect는 클라이언트에서 newPost.id를 받아서 수행)
    return newPost;
  }
);


// ------------------------------------------------------------------
// 2. 게시물 삭제 액션
// ------------------------------------------------------------------

// 💡 Action용 스키마: postId만 받음 (userId는 검증용으로 서버 주입)
const DeletePostActionSchema = DeletePostSchema.pick({ postId: true });

export const deletePostAction = createSafeAction(
  DeletePostActionSchema,
  async (data, user) => {
    // 1. 서비스 호출
    const deletedPost = await deletePostInDb({
      postId: data.postId,
      userId: user.id, // 작성자 본인 확인용
    });

    // 2. 페이지 갱신
    revalidatePath(ROUTES.HOME);
    revalidatePath(ROUTES.PROFILE(user.username));
    redirect(ROUTES.PROFILE(user.username));

    // 3. 결과 반환
    return deletedPost;
  }
);


const UpdatePostActionSchema = UpdatePostSchema.omit({ userId: true });

export const updatePostAction = createSafeAction(
  UpdatePostActionSchema,
  async (data, user) => {
    // 1. 서비스 호출
    const updatedPost = await updatePostInDB({
      ...data, // postId, caption, location...
      userId: user.id, // ⭐️ 보안 핵심: 현재 로그인한 유저 ID 주입
    });

    // 2. 페이지 갱신 (영향받는 모든 곳)
    // - 해당 게시물 상세 페이지
    revalidatePath(ROUTES.POST_DETAIL(data.postId));
    // - 홈 피드 (내용이 바뀌었으므로)
    revalidatePath(ROUTES.HOME);
    // - 내 프로필 (내용이 바뀌었으므로)
    revalidatePath(ROUTES.PROFILE(user.username));

    // 3. 결과 반환
    return updatedPost;
  }
);