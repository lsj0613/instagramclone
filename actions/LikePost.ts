"use server";

import { auth } from "@/auth";
import Post from "@/models/post.model";
import connectDB from "@/lib/db";
import { revalidatePath } from "next/cache";
// 아까 만든 서비스 함수들 import (경로는 실제 파일 위치에 맞게 수정하세요)
import { createNotification, deleteNotification } from "@/lib/toggleNotification"; 

export async function toggleLikeAction(postId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("인증이 필요합니다.");

    await connectDB();
    const userId = session.user.id;

    const post = await Post.findById(postId);
    if (!post) throw new Error("게시물을 찾을 수 없습니다.");

    if (post.author.toString() === userId) {
      throw new Error("본인의 게시물에는 좋아요를 누를 수 없습니다.");
    }

    const isLiked = post.likes.map((id) => id.toString()).includes(userId);

    if (isLiked) {
      // 1. 좋아요 취소 로직
      await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });

      // [알림 삭제] 좋아요를 취소했으니 알림도 회수합니다.
      await deleteNotification({
        issuerId: userId,
        receiverId: post.author.toString(), // ObjectId를 문자열로 변환
        type: "LIKE",
        postId: postId,
      });

    } else {
      // 2. 좋아요 추가 로직
      await Post.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });

      // [알림 생성] 좋아요를 눌렀으니 알림을 보냅니다.
      await createNotification({
        issuerId: userId,
        receiverId: post.author.toString(),
        type: "LIKE",
        postId: postId,
      });
    }

    revalidatePath(`/post/${postId}`);
    return { success: true };
  } catch (error) {
    console.error("Like toggle error:", error);
    // 사용자에게 보여줄 에러 메시지는 단순화하는 것이 보안상 좋습니다.
    throw new Error("작업을 처리하는 중 문제가 발생했습니다.");
  }
}