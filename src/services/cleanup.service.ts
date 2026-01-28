import { v2 as cloudinary } from "cloudinary";
import db from "@/lib/db"; // Drizzle DB 인스턴스 경로 확인 필요
import { postImages } from "@/db/schema"; // 제공해주신 schema.ts 경로
import { inArray } from "drizzle-orm";
import { CLOUDINARY_FOLDERS } from "@/shared/constants";

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function cleanupOrphanedImages() {
  try {
    console.log("🧹 [Cleanup] 이미지 정리 작업 시작...");

    // 1. Cloudinary에서 최신 이미지 리소스 가져오기 (Admin API)
    // - max_results: 한 번에 가져올 개수 (최대 500)
    // - type: 'upload' (업로드된 이미지만)
    // - prefix: 특정 폴더만 검사하려면 설정 (예: 'instagram-clone/')
    const cloudinaryResponse = await cloudinary.api.resources({
      type: "upload",
      prefix: CLOUDINARY_FOLDERS.POST_IMAGES, // 프로젝트에서 사용하는 폴더명이 있다면 설정
      max_results: 500,
      direction: "desc", // 최신순
    });

    const cloudResources = cloudinaryResponse.resources;

    if (!cloudResources || cloudResources.length === 0) {
      return { deletedCount: 0, message: "Cloudinary가 비어있습니다." };
    }

    // 2. Cloudinary 리소스에서 public_id 추출
    const cloudPublicIds: string[] = cloudResources.map(
      (res: any) => res.public_id
    );

    // 3. DB(postImages 테이블)에 존재하는지 확인
    // Drizzle: publicId가 cloudPublicIds 배열 안에 있는 것만 조회
    const existingImages = await db
      .select({ publicId: postImages.publicId })
      .from(postImages)
      .where(inArray(postImages.publicId, cloudPublicIds));

    // 검색 속도 향상을 위해 Set으로 변환
    const dbPublicIdSet = new Set(existingImages.map((img) => img.publicId));

    // 4. 삭제 대상 선별 (Cloudinary엔 있는데 DB엔 없는 것)
    // ⭐️ 안전장치: 생성된 지 1시간(60분)이 안 된 이미지는 삭제하지 않음
    // (사용자가 업로드 중이거나, DB 트랜잭션이 아직 안 끝났을 수 있음)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const orphanIds = cloudResources
      .filter((res: any) => {
        const createdAt = new Date(res.created_at);
        const isNotInDb = !dbPublicIdSet.has(res.public_id);
        const isOldEnough = createdAt < oneHourAgo;

        return isNotInDb && isOldEnough;
      })
      .map((res: any) => res.public_id);

    if (orphanIds.length === 0) {
      console.log("✨ [Cleanup] 삭제할 고아 이미지가 없습니다.");
      return { deletedCount: 0, message: "Clean" };
    }

    console.log(
      `🗑️ [Cleanup] 발견된 고아 이미지 ${orphanIds.length}개 삭제 중...`,
      orphanIds
    );

    // 5. Cloudinary에서 실제 삭제 요청
    const deleteResult = await cloudinary.api.delete_resources(orphanIds);

    console.log("✅ [Cleanup] 삭제 완료:", deleteResult);

    return {
      deletedCount: orphanIds.length,
      deletedIds: orphanIds,
      details: deleteResult,
    };
  } catch (error) {
    console.error("❌ [Cleanup] 에러 발생:", error);
    throw error;
  }
}
