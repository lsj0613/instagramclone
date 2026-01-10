"use server";

import connectDB from "@/lib/db";
import Post from "@/models/post.model";
import User from "@/models/user.model";

export async function getPostsByUsername(username: string) {
  try {
    await connectDB();

    // 1. 유저네임으로 유저 찾기 (ID를 알아내기 위함)
    const user = await User.findOne({ username }).select("_id");

    if (!user) {
      return { success: false, error: "유저를 찾을 수 없습니다." };
    }

    // 2. 해당 유저가 작성한 게시물 찾기
    // 프로필 그리드에는 이미지와 ID만 있으면 되므로 필요한 필드만 select하여 최적화
    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 }) // 최신순 정렬
      .select("images _id") // 썸네일용 이미지와 링크용 ID만 가져옴
      .lean();

    // 3. 직렬화 (ObjectId -> string)
    const safePosts = posts.map((post) => ({
      id: post._id.toString(),
      image: post.images[0], // 첫 번째 이미지를 썸네일로 사용
    }));

    return { success: true, data: safePosts };
  } catch (error) {
    console.error("게시물 리스트 조회 실패:", error);
    return { success: false, error: "게시물을 불러올 수 없습니다." };
  }
}
