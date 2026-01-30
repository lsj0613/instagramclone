"use server";

import { createSafeAction } from "@/lib/safe-action";
import { updateUser, deleteUser, searchUsers } from "./service";
import {
  UpdateUserSchema,
  DeleteUserSchema,
  SearchUserSchema,
} from "./validation";
import { revalidatePath } from "next/cache";

export const updateUserAction = createSafeAction(
  UpdateUserSchema.omit({ userId: true }),
  async (data, user) => {
    const updated = await updateUser({ ...data, userId: user.id });
    revalidatePath(`/profile/${user.username}`);
    return updated;
  }
);

export const deleteUserAction = createSafeAction(
  DeleteUserSchema.pick({ userId: true }), // 본인 확인용
  async (_, user) => {
    const deleted = await deleteUser({ userId: user.id });
    revalidatePath("/");
    return deleted;
  }
);

export const searchUsersAction = createSafeAction(
  SearchUserSchema,
  async (data, user) => {
    return await searchUsers(data.query, user.id);
  }
);
