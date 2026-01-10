"use server";

import { auth } from "@/lib/auth";
import Post from "@/features/post/models/post.model";
import connectDB from "@/lib/db";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { createNotification, deleteNotification } from "@/features/notification/actions/manage-notification";

export async function toggleLikeAction(postId: string) {
  await connectDB();
  
  const session = await mongoose.startSession();
  
  try {
    const res = await session.withTransaction(async () => {
      const authSession = await auth();
      if (!authSession?.user?.id) throw new Error("인증이 필요합니다.");
      const userId = authSession.user.id;

      // 1. 게시물 존재 여부와 본인 확인 (단순 읽기)
      // 이 부분은 데이터가 변하는 것이 아니므로 가볍게 읽습니다.
      const postInfo = await Post.findById(postId).select("author likes").session(session);
      if (!postInfo) throw new Error("게시물을 찾을 수 없습니다.");
      if (postInfo.author.toString() === userId) {
        throw new Error("본인의 게시물에는 좋아요를 누를 수 없습니다.");
      }

      const isLiked = postInfo.likes.map(id => id.toString()).includes(userId);

      if (isLiked) {
        // [원자적 취소] "내가 좋아요를 누른 상태일 때만" pull 실행
        const updatedPost = await Post.findOneAndUpdate(
          { _id: postId, likes: userId }, // 조건: likes 배열에 내가 존재할 때만
          { $pull: { likes: userId } },
          { session, new: true }
        );

        // updatedPost가 null이면 이미 다른 요청에 의해 취소된 것
        if (updatedPost) {
          await deleteNotification({
            issuerId: userId,
            receiverId: postInfo.author.toString(),
            type: "LIKE",
            postId: postId,
          }, session);
        }
      } else {
        // [원자적 추가] "내가 좋아요를 안 누른 상태일 때만" addToSet 실행
        const updatedPost = await Post.findOneAndUpdate(
          { _id: postId, likes: { $ne: userId } }, // 조건: likes 배열에 내가 없을 때만
          { $addToSet: { likes: userId } },
          { session, new: true }
        );

        // updatedPost가 null이면 이미 다른 요청에 의해 추가된 것
        if (updatedPost) {
          await createNotification({
            issuerId: userId,
            receiverId: postInfo.author.toString(),
            type: "LIKE",
            postId: postId,
          }, session);
        }
      }
      
      return { success: true };
    });

    revalidatePath(`/post/${postId}`);
    return res;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Like toggle transaction error:", error);
    throw new Error(error.message || "작업 처리 중 문제가 발생했습니다.");
  } finally {
    await session.endSession();
  }
}