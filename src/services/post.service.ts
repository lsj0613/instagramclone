import db from "@/lib/db";
import { posts, postImages } from "@/db/schema";

// 서비스 함수에 전달할 데이터 타입 정의
interface CreatePostServiceParams {
  authorId: string;
  caption: string;
  locationName?: string; // 위치는 없을 수도 있으므로 optional
  images: string[];      // 유효한 이미지 URL 배열
}

/**
 * 게시물과 이미지를 트랜잭션으로 안전하게 저장합니다.
 */
export async function createPostInDB({
  authorId,
  caption,
  locationName,
  images,
}: CreatePostServiceParams) {
  
  // db.transaction을 열고, 내부에서는 db 대신 tx를 사용합니다.
  return await db.transaction(async (tx) => {
    
    // 1. 게시물(Post) 저장
    const [newPost] = await tx
      .insert(posts)
      .values({
        authorId,
        caption,
        locationName, // 값이 없으면 undefined -> DB에는 null로 저장됨
      })
      .returning(); // 생성된 게시물 정보(ID 포함) 반환

    // 2. 이미지(PostImages) 저장 (이미지가 있는 경우에만)
    if (images.length > 0) {
      const imageRecords = images.map((url, index) => ({
        postId: newPost.id, // 위에서 만든 게시물 ID 사용
        url: url,
        order: index,
      }));

      // tx를 사용해야 게시물 생성이 실패하면 이미지 저장도 취소됩니다.
      await tx.insert(postImages).values(imageRecords);
    }

    return newPost; // 생성된 게시물 객체 반환
  });
}