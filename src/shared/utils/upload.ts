
import { getCloudinarySignature } from "@/shared/actions/GetCloudinarySignature";
import { publicEnv } from "@/lib/env";

// 클라이언트에서 실행되는 일반 함수
export async function uploadToCloudinaryClient(file: File) {
    // 1. 서버 액션 호출해서 서명 받아오기
    const { timestamp, signature } = await getCloudinarySignature();
  
    // 2. Cloudinary로 보낼 데이터 준비
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", publicEnv.NEXT_PUBLIC_CLOUDINARY_API_KEY); // 클라이언트용 환경변수 필요
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", "user_posts");
  
    // 3. 브라우저에서 직접 Cloudinary로 전송 (서버 안 거침!)
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
  

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Cloudinary 에러 상세:", errorData); // 브라우저 콘솔 확인 필!
      throw new Error(errorData.error?.message || "이미지 업로드 실패");
    }
    if (!response.ok) throw new Error("이미지 업로드 실패");
  
    const data = await response.json();
    return data.secure_url; // 업로드된 이미지 URL 반환
  }