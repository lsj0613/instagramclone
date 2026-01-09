import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  throw new Error("Cloudinary 환경 변수가 설정되지 않았습니다.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "user_posts", // 저장할 폴더명
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary 업로드 에러:", error);
          reject(error);
        } else {
          resolve(result?.secure_url as string);
        }
      }
    ).end(buffer);
  });
}