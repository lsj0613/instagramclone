"use server";

import { revalidatePath } from "next/cache";
import connectDB from "@/lib/db";
import Post from "@/lib/models/Post.model";
import { PostCreateSchema, PostCreateInput } from "@/lib/validation";

// 반환 값에 대한 타입 정의
interface SuccessResponse {
  success: true;
  data: string; // 직렬화된 JSON 문자열
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ActionResponse = SuccessResponse | ErrorResponse;

export async function createPost(
  input: PostCreateInput
): Promise<ActionResponse> {
  try {
    await connectDB();

    // 1. 데이터 검증 (입력값이 PostCreateInput 형식을 따르는지 확인)
    const validatedData = PostCreateSchema.parse(input);

    // 2. 데이터베이스 저장
    // Mongoose 모델 생성 시 타입을 명시적으로 지정
    const newPost = await Post.create({
      author: validatedData.author,
      images: validatedData.images,
      caption: validatedData.caption,
      location: validatedData.location,
    });

    // 3. Next.js 16 캐시 무효화
    revalidatePath("/app/explore");

    return {
      success: true,
      // Mongoose 객체를 클라이언트로 안전하게 전달하기 위해 JSON 직렬화
      data: JSON.stringify(newPost),
    };
  } catch (error) {
    // 에러 타입 가드
    const errorMessage =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";

    return {
      success: false,
      error: errorMessage,
    };
  }
}
