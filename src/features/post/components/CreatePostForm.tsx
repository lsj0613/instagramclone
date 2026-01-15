"use client";

import { useState, useRef, useActionState, startTransition } from "react";
import { createPost } from "@/features/post/actions";
import ImagePreview from "./ImagePreview";
import { Loader2, MapPin, ImagePlus, XCircle, FileText } from "lucide-react"; // 아이콘 임포트
import { uploadToCloudinaryClient } from "@/shared/utils/upload";


export default function CreatePostForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isActionPending] = useActionState(createPost, null);
  
  // 1. 업로드 상태를 관리할 state 추가
  const [isUploading, setIsUploading] = useState(false); 

  // 2. 둘 중 하나라도 진행 중이면 로딩으로 취급
  const isPending = isUploading || isActionPending;  // UI 상태 관리
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setIsUploading(true);
    try {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const uploadPromises = files.map((file) =>
        uploadToCloudinaryClient(file)
      );
      const imageUrls = await Promise.all(uploadPromises);
      formData.delete("images");
      imageUrls.forEach((url) => {
        formData.append("images", url); // 동일한 키로 여러 번 추가
      }); // 액션)

      startTransition(() => {
        formAction(formData); // 여기서부터는 isActionPending이 true가 됨
      });
        } catch (error) {
      console.error("Upload failed:", error);
      // 에러 처리 로직 (사용자 알림 등)
    }
    setIsUploading(false);
  }

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles = Array.from(newFiles).filter((file) =>
      file.type.startsWith("image/")
    );
    if (validFiles.length === 0) return;
    setFiles((prev) => [...prev, ...validFiles]);
    console.log("changed");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 space-y-8"
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">새 게시물 만들기</h2>
          <p className="text-sm text-gray-500">
            당신의 특별한 순간을 공유해보세요.
          </p>
        </div>

        {/* 전역 에러 메시지 */}
        {state?.message && (
          <div
            className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium animate-pulse"
            aria-live="polite"
          >
            <XCircle size={18} />
            {state?.message}
          </div>
        )}

        {/* 파일 업로드 영역 */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            사진 업로드{" "}
            <span className="text-blue-500 text-xs font-normal">(필수)</span>
          </label>

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative group flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer
              ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                  : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
              }
              ${state?.errors?.images ? "border-red-300 bg-red-50" : ""}
            `}
          >
            <input
              type="file"
              name="images"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />

            {/* 아이콘 및 안내 문구 */}
            <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-blue-500 transition-colors">
              <div className="p-3 bg-gray-50 rounded-full group-hover:bg-blue-100 transition-colors">
                <ImagePlus size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  클릭하여 업로드하거나
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  이미지를 여기로 끌어오세요
                </p>
              </div>
            </div>
          </div>

          {state?.errors?.images && (
            <p className="text-xs text-red-500 font-medium pl-1">
              * {state?.errors.images}
            </p>
          )}

          {/* 미리보기 영역 (Grid Layout 개선) */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
              {files.map((file, index) => (
                <ImagePreview
                  key={file.name + file.size + index}
                  file={file}
                  onRemove={() => removeImage(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 문구 입력 */}
        <div className="space-y-2">
          <label
            htmlFor="caption"
            className="block text-sm font-semibold text-gray-700"
          >
            문구 입력
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 text-gray-400">
              <FileText size={18} />
            </div>
            <textarea
              id="caption"
              name="caption"
              rows={4}
              className={`
                w-full pl-10 p-3 bg-gray-50 border rounded-xl outline-none transition-all resize-none
                focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                ${
                  state?.errors?.caption
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-200"
                }
              `}
              placeholder="사진에 대한 설명을 적어주세요..."
            />
          </div>
          {state?.errors?.caption && (
            <p className="text-xs text-red-500 font-medium pl-1">
              * {state.errors.caption}
            </p>
          )}
        </div>

        {/* 위치 입력 */}
        <div className="space-y-2">
          <label
            htmlFor="location"
            className="block text-sm font-semibold text-gray-700"
          >
            위치 추가{" "}
            <span className="text-gray-400 text-xs font-normal">(선택)</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <MapPin size={18} />
            </div>
            <input
              type="text"
              id="location"
              name="location"
              className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="예: 서울특별시 강남구"
            />
          </div>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center py-3.5 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              게시 중...
            </>
          ) : (
            "공유하기"
          )}
        </button>
      </form>
    </div>
  );
}
