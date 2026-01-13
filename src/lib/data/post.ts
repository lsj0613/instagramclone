import db from "@/lib/db";
import { likes, posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { PostInfo } from "@/lib/types";
import { redirect } from "next/navigation";

// 반환 타입을 심플하게 정의 (데이터 있거나 or 없거나)
export async function getPostInfoById(postId: string): Promise<PostInfo | null> {
  try {
    // 1. 로그인 체크 (필요하다면)
    // 공개 게시판이라면 이 부분은 없어도 됩니다.
    const session = await auth();
    if (!session?.user?.id) {
      console.warn(`[getPostById] 비로그인 유저의 접근: ${postId}`);
      redirect("/login"); // 로그인 경로에 맞게 수정하세요
    }
    // 2. 유효성 검사 (UUID 형식인지?)
    // Postgres는 UUID 컬럼에 이상한 문자열 넣으면 DB 에러를 뱉습니다.
    // 그걸 방지하기 위한 정규식 체크입니다.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
    if (!isUuid) {
        return null; // ID 형식이 이상하면 그냥 '없음' 취급
    }

    // 3. DB 조회
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
        images: {
          orderBy: (postImages, { asc }) => [asc(postImages.order)],
        },
        // ★ 핵심 추가 로직: likes 테이블을 조인하되, "내 아이디"랑 일치하는 것만 가져옴
        likes: {
          where: eq(likes.userId, session.user.id),
          columns: { userId: true }, // 존재 여부만 알면 되므로 컬럼 최소화
        }
      },
    });

    if (!post) {
      return null;
    }

    // 4. 데이터 가공
    // likes 배열에 요소가 하나라도 있으면 내가 좋아요를 누른 것임

    // 4. 데이터 가공 및 반환
    const { likes: likedRecords, ...postData } = post;

    return {
      ...postData, // likes가 제거된 순수한 게시물 정보들
      isLiked: likedRecords.length > 0, // boolean 값 계산하여 추가
      createdAt: post.createdAt.toISOString(),
    };

  } catch (error) {
    // 5. 예기치 못한 에러 처리 (DB 연결 끊김 등)
    // 유저에겐 보여주지 말고, 개발자가 볼 수 있게 서버 로그만 남깁니다.
    console.error(`❌ DB Error fetching post ${postId}:`, error);
    throw new Error("Something Went Wrong.");
    
    // 만약 치명적인 에러라 아예 500 페이지를 띄우고 싶다면?
    // throw error; // 이렇게 던지면 error.tsx가 잡습니다.
  }
}