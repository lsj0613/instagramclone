// src/lib/actions/post.actions.ts
"use server";

import connectDB from "@/lib/db";
// 관계된 모델을 참조하기 위해 User 모델도 임포트가 필요할 수 있습니다.
import "@/lib/models/User";

import Post, { IPostPopulated } from "@/lib/models/Post.model";

// 1. IPost를 기반으로 하되, author가 객체로 변환된 타입을 정의합니다.
// Omit을 사용하여 기존 author(ObjectId)를 제거하고 새로운 타입을 주입합니다.

interface PostResponse {
  success: boolean;
  data?: IPostPopulated; // any 대신 명확한 타입을 지정
  error?: string;
}

export async function getPostById(postId: string): Promise<PostResponse> {
  try {
    // 1. 데이터베이스 연결 확인
    await connectDB();

    /**
     * 2. 게시물 조회 및 관계 데이터 병합 (Populate)
     * - findById를 통해 고유 ID로 검색합니다.
     * - .populate("author")를 통해 작성자의 ID가 아닌 실제 유저 객체를 가져옵니다.
     * - .lean()은 Mongoose 문서 객체가 아닌 순수 자바스크립트 객체를 반환하여 성능을 높입니다.
     */
    const post = await Post.findById(postId)
      .populate({
        path: "author",
        select: "username profileImage bio", // 필요한 유저 정보만 선택적으로 로드
      })
      .lean();

    // 3. 존재 여부 확인
    if (!post) {
      return {
        success: false,
        error: "요청하신 게시물을 찾을 수 없습니다.",
      };
    }

    // 4. 데이터 직렬화 및 반환
    // 클라이언트 컴포넌트로 전송하기 위해 ObjectId 등을 문자열로 처리합니다.
    return {
      success: true,
      data: JSON.parse(JSON.stringify(post)),
    };
  } catch (error: unknown) {
    // 1. 서버 콘솔 로깅 (디버깅용)
    console.error("게시물 조회 오류:", error);

    // 2. error 타입에 따른 메시지 추출
    let errorMessage = "데이터를 가져오는 중 서버 오류가 발생했습니다.";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
