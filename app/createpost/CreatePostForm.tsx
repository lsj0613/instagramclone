"use client";

import { useState } from "react";
import { useForm } from "react-hook-form"; // react-hook-form이 없다면 설치 필요, 여기서는 기본 상태관리로 구현 가능하나 편의상 상태관리로 구현
import { createPost } from "@/lib/actions/CreatePost"; //
import { useRouter } from "next/navigation";

interface CreatePostFormProps {
  userId: string;
}

export default function CreatePostForm({ userId }: CreatePostFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폼 상태 관리
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  // 이미지 URL 입력을 위한 상태 (배열)
  const [imageUrls, setImageUrls] = useState<string[]>([""]);

  // 이미지 URL 입력 필드 추가
  const addImageField = () => {
    setImageUrls([...imageUrls, ""]);
  };

  // 이미지 URL 입력 값 변경
  const handleImageChange = (index: number, value: string) => {
    const newImages = [...imageUrls];
    newImages[index] = value;
    setImageUrls(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // 빈 URL 제거 및 유효성 검사 준비
    const validImages = imageUrls.filter((url) => url.trim() !== "");

    if (validImages.length === 0) {
      setError("최소 하나의 이미지 URL을 입력해야 합니다.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 서버 액션 호출
      const result = await createPost({
        author: userId, // 서버에서 받은 ID 자동 주입
        caption: caption,
        location: location,
        images: validImages,
      });

      if (result.success) {
        // 성공 시 메인 피드나 해당 게시물로 이동
        alert("게시물이 성공적으로 작성되었습니다!");
        router.push("/"); 
        router.refresh(); // 데이터 갱신
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("게시물 작성 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
      {/* 에러 메시지 표시 */}
      {error && (
        <div className="p-3 bg-red-100 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 이미지 URL 입력 (임시) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          이미지 URL (최소 1개)
        </label>
        {imageUrls.map((url, index) => (
          <div key={index} className="flex mb-2">
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={url}
              onChange={(e) => handleImageChange(index, e.target.value)}
              className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={index === 0} // 첫 번째 필드는 필수
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addImageField}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + 이미지 추가하기
        </button>
      </div>

      {/* 문구 입력 */}
      <div>
        <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
          문구 입력
        </label>
        <textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="사진에 대한 설명을 적어주세요..."
        />
        <p className="text-right text-xs text-gray-400 mt-1">
          {caption.length} / 2200
        </p>
      </div>

      {/* 위치 입력 */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
          위치 추가 (선택)
        </label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="예: 서울특별시 강남구"
        />
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? "게시 중..." : "공유하기"}
      </button>
    </form>
  );
}