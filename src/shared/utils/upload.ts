import { getCloudinarySignature } from "@/shared/actions/get-cloudinary-signature";
import { publicEnv } from "@/lib/env";
import { CLOUDINARY_FOLDERS } from "../constants";

// 반환 타입 정의 (사용처에서 자동완성 되도록)
export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadToCloudinaryClient(
  file: File
): Promise<CloudinaryUploadResult> {
  // 1. 서버 액션 호출해서 서명 받아오기
  const { timestamp, signature } = await getCloudinarySignature();

  // 2. Cloudinary로 보낼 데이터 준비
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", publicEnv.NEXT_PUBLIC_CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", CLOUDINARY_FOLDERS.POST_IMAGES);

  // 3. Cloudinary 전송
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("❌ Cloudinary 에러 상세:", errorData);
    throw new Error(errorData.error?.message || "이미지 업로드 실패");
  }

  const data = await response.json();

  // ⭐️ [핵심] 필요한 정보만 골라서 객체로 반환
  return {
    url: data.secure_url, // HTTPS URL
    publicId: data.public_id, // 파일 고유 ID (삭제 시 필요)
    width: data.width, // 이미지 너비
    height: data.height, // 이미지 높이
    format: data.format, // jpg, png 등 확장자
  };
}
