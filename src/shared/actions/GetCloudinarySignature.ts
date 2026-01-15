"use server";

import { v2 as cloudinary } from "cloudinary";

// Cloudinary 설정 (환경변수 확인 필수)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function getCloudinarySignature() {
  // 1. 타임스탬프 생성 (현재 시간)
  const timestamp = Math.round(new Date().getTime() / 1000);

  // 2. 서명 생성 (Cloudinary SDK가 알아서 해줌)
  // paramsToSign에는 업로드할 때 쓸 옵션들(folder 등)이 들어가야 함
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: "user_posts", // 업로드할 폴더명 (클라이언트와 일치해야 함)
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return { timestamp, signature };
}