"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSafeAction } from "@/lib/safe-action";
import { createPost, deletePost, updatePost } from "./service";
import {
  CreatePostSchema,
  DeletePostSchema,
  UpdatePostSchema,
} from "@/features/post/validation";
import { ROUTES } from "@/shared/constants";

export const createPostAction = createSafeAction(
  CreatePostSchema.omit({ authorId: true }),
  async (data, user) => {
    const newPost = await createPost({
      ...data,
      authorId: user.id,
    });

    revalidatePath(ROUTES.HOME);
    revalidatePath(ROUTES.PROFILE(user.username));

    // 생성 후 본인 프로필로 이동
    redirect(ROUTES.PROFILE(user.username));
    return newPost;
  }
);

export const updatePostAction = createSafeAction(
  UpdatePostSchema.omit({ userId: true }),
  async (data, user) => {
    const updatedPost = await updatePost({
      ...data,
      userId: user.id,
    });

    revalidatePath(ROUTES.POST_DETAIL(data.postId));
    revalidatePath(ROUTES.HOME);
    revalidatePath(ROUTES.PROFILE(user.username));
    redirect(ROUTES.POST_DETAIL(data.postId));

    return updatedPost;
  }
);

export const deletePostAction = createSafeAction(
  DeletePostSchema.pick({ postId: true }),
  async (data, user) => {
    const deletedPost = await deletePost({
      postId: data.postId,
      userId: user.id,
    });

    revalidatePath(ROUTES.HOME);
    revalidatePath(ROUTES.PROFILE(user.username));

    redirect(ROUTES.PROFILE(user.username));
    return deletedPost;
  }
);
