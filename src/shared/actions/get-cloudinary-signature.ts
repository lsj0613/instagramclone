"use server";

import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/services/user.service";
import { CLOUDINARY_FOLDERS, ROUTES } from "../constants";
import { redirect } from "next/navigation";

// Cloudinary 설정 (환경변수 확인 필수)
cloudinary.config({
  cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function getCloudinarySignature() {
  const user = await getCurrentUser();
  if (!user) {
    console.log("🚫 [SafeAction:Fail] 인증되지 않은 유저"); // 로그 추가
    redirect(ROUTES.LOGIN);
  }
  // 1. 타임스탬프 생성 (현재 시간)
  const timestamp = Math.round(new Date().getTime() / 1000);

  // 2. 서명 생성 (Cloudinary SDK가 알아서 해줌)
  // paramsToSign에는 업로드할 때 쓸 옵션들(folder 등)이 들어가야 함
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: CLOUDINARY_FOLDERS.POST_IMAGES, // 업로드할 폴더명 (클라이언트와 일치해야 함)
    },
    env.CLOUDINARY_API_SECRET!
  );

  return { timestamp, signature };
}
