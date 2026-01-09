"use server";

import { revalidatePath } from "next/cache";
import connectDB from "@/lib/db";
import Post from "@/models/post.model";
import { PostCreateSchema } from "@/lib/validation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { uploadToCloudinary } from "@/lib/cloudinary";

// 반환 값에 대한 타입 정의
export interface createPostErrorResponse {
  errors?: { images?: string; caption?: string; location?: string };
  message?: string;
}

/*formData를 받아 새 Post를 db에 생성하고 해당 Post 객체를 반환 */
export async function createPost(
  formData: FormData
): Promise<createPostErrorResponse> {
  const session = await auth();
  const currentUser = session?.user?.id;

  if (!currentUser) {
    // 에러를 던져서 즉시 catch 블록으로 이동시킴 (아래 로직 실행 안 됨)
    throw new Error("로그인이 필요한 서비스입니다.");
  }

  try {
    await connectDB();

    const rawImages = formData.getAll("images") as File[];
    const validImages = rawImages.filter(
      (file) => file.name !== "" && file.size > 0
    );
    const parsedFormData = {
      images: validImages,
      caption: formData.get("caption") as string,
      location: formData.get("location") as string,
    };

    // 1. 데이터 검증 (입력값이 PostCreateInput 형식을 따르는지 확인)
    const validation = PostCreateSchema.safeParse(parsedFormData);

    if (!validation.success) {
      // ZodError를 필드별 에러 객체로 변환 ({ images: [...], caption: [...] })
      const fieldErrors = validation.error.flatten().fieldErrors;

      return {
        errors: {
          images: fieldErrors.images?.[0], // 첫 번째 에러 메시지만 전달
          caption: fieldErrors.caption?.[0],
          location: fieldErrors.location?.[0],
        },
        message: "입력값을 확인해주세요.",
      };
    }

    const validatedData = validation.data;

    const uploadPromises = validatedData.images.map((file) =>
      uploadToCloudinary(file)
    );
    const imageUrls = await Promise.all(uploadPromises);
    // 2. 데이터베이스 저장
    // Mongoose 모델 생성 시 타입을 명시적으로 지정
    await Post.create({
      author: currentUser,
      images: imageUrls,
      caption: validatedData.caption,
      location: validatedData.location,
    });

    // 3. Next.js 16 캐시 무효화
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
  revalidatePath("/app/profile");
  redirect(`/profile/${session?.user?.name}`);
}
