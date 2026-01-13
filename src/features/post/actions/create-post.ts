"use server";
import { revalidatePath } from "next/cache";
import { PostCreateSchema } from "@/shared/schemas/validation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createPostInDB } from "@/services/post.service";

// 반환 값에 대한 타입 정의
export interface createPostErrorResponse {
  errors?: { images?: string[]; caption?: string[]; location?: string[] };
  message?: string;
}

/*formData(caption, location, images)를 받아 새 Post를 db에 생성 */
export async function createPost(
  prevState: createPostErrorResponse | null, // 첫 번째 인자 추가
  formData: FormData
): Promise<createPostErrorResponse> {
  const session = await auth();
  const currentUser = session?.user?.id;

  if (!currentUser) {
    // 에러를 던져서 즉시 catch 블록으로 이동시킴 (아래 로직 실행 안 됨)
    throw new Error("로그인이 필요한 서비스입니다.");
  }
  const rawInput = {
    // 이미지는 여러 개이므로 getAll() 사용
    images: formData.getAll("images") as string[], 
    
    // 나머지는 하나씩이므로 get() 사용
    // (빈 문자열이 올 경우 null이나 undefined로 처리하고 싶다면 여기서 변환 로직 추가 가능)
    caption: formData.get("caption")?.toString() || undefined,
    location: formData.get("location")?.toString() || undefined,
  };

  // 1-1. (선택사항) 빈 문자열 이미지 URL 필터링 등 기초적인 정제
  // Zod의 .url() 검사 전에 명백히 잘못된 데이터(빈 값)는 미리 쳐내는 게 깔끔할 수 있습니다.
  rawInput.images = rawInput.images.filter(url => url.trim() !== "");

  // 2. 공유된 스키마로 검증 (Validation)
  const validation = PostCreateSchema.safeParse(rawInput);

  if (!validation.success) {
    // 검증 실패 시 에러 반환
    return {
      errors: validation.error.flatten().fieldErrors,
      message: "입력값을 확인해주세요.",
    };
  }

  // 3. 검증 통과된 데이터 사용
  const validatedData = validation.data; 
  // validatedData는 이제 { images: string[], caption?: string, location?: string } 타입이 확실함
  try {
    // 2. 데이터베이스 저장
    await createPostInDB({
      authorId: currentUser,
      caption: validatedData.caption as string,
      locationName: validatedData.location, // 스키마의 locationName과 매칭
      images: validatedData.images,
    }
    );

  revalidatePath("/app/profile");
  redirect(`/profile/${session?.user?.name}`); 
 } catch (error) {
    let errorMessage = "알 수 없는 오류가 발생했습니다.";

    if (error instanceof Error) {
      // 1. 표준 에러 객체인 경우
      errorMessage = error.message;
    } else if (typeof error === "string") {
      // 2. 문자열만 던져진 경우
      errorMessage = error;
    }

    // 로그 기록 (서버 사이드)
    console.error("실제 에러 로그:", error);

    return {
      message: errorMessage,
    };
  }

}
