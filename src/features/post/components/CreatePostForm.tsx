"use client";

import { useState, useRef, useActionState, startTransition } from "react";
import { createPostAction } from "@/features/post/actions";
import ImagePreview from "./ImagePreview";
import { Loader2, MapPin, ImagePlus, XCircle, FileText } from "lucide-react";
import { uploadToCloudinaryClient } from "@/shared/utils/upload";
import { UI_TEXT } from "@/shared/constants";
import { useForm } from "react-hook-form"; // ⭐️ 추가
import { zodResolver } from "@hookform/resolvers/zod"; // ⭐️ 추가
import {
  PostCreateSchema,
  type CreatePostParams,
} from "@/shared/utils/validation"; // ⭐️ 추가
import z from "zod";

// 클라이언트 폼에서는 '이미지 URL'이나 '작성자 ID'가 아직 없습니다.
// 따라서 텍스트 필드(caption, location)만 먼저 검증하는 스키마를 씁니다.
const ClientFormSchema = PostCreateSchema.pick({
  caption: true,
  locationName: true,
});
// 혹은 .omit({ images: true, authorId: true }) 사용 가능

type ClientFormType = z.infer<typeof ClientFormSchema>;

export default function CreatePostForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 서버 액션 상태
  const [serverState, formAction, isActionPending] = useActionState(
    createPostAction,
    null
  );

  // 2. React Hook Form 설정 (클라이언트 검증용)
  const {
    register,
    handleSubmit, // ⭐️ 기존 handleSubmit 대신 이거 씀
    formState: { errors: clientErrors }, // ⭐️ 클라이언트 에러
    setError, // 수동 에러 설정 (이미지용)
    clearErrors,
  } = useForm<ClientFormType>({
    resolver: zodResolver(ClientFormSchema),
  });

  const [isUploading, setIsUploading] = useState(false);
  const isPending = isUploading || isActionPending;
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // 3. 통합 제출 핸들러 (React Hook Form이 1차 검증 후 호출함)
  const onSubmit = async (data: ClientFormType) => {
    // A. 이미지 파일 수동 검증
    if (files.length === 0) {
      setError("root.images", {
        type: "manual",
        message: "이미지는 최소 1장 필요합니다.", // ⭐️ 상수로 대체 권장
      });
      return;
    }

    setIsUploading(true);
    try {
      // B. 클라우디너리 업로드
      const uploadPromises = files.map((file) =>
        uploadToCloudinaryClient(file)
      );
      const imageUrls = await Promise.all(uploadPromises);

      // C. FormData 구성 (서버 액션용)
      const formData = new FormData();
      formData.append("caption", data.caption);
      if (data.locationName) {
        formData.append("locationName", data.locationName);
      }
      imageUrls.forEach((url) => {
        formData.append("images", url);
      });

      // D. 서버 액션 호출
      startTransition(() => {
        formAction(formData);
      });
    } catch (error) {
      console.error("Upload failed:", error);
      setError("root.server", { message: "업로드 중 오류가 발생했습니다." });
    }
    setIsUploading(false);
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles = Array.from(newFiles).filter((file) =>
      file.type.startsWith("image/")
    );
    if (validFiles.length === 0) return;

    setFiles((prev) => [...prev, ...validFiles]);
    clearErrors("root.images"); // ⭐️ 파일 추가되면 에러 제거
  };

  // ... (handleFileChange, onDragOver, onDragLeave, onDrop, removeImage는 기존과 동일) ...
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      {/* ⭐️ handleSubmit(onSubmit)으로 감쌈 */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 space-y-8"
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            {UI_TEXT.CreatePostTitle}
          </h2>
          <p className="text-sm text-gray-500">{UI_TEXT.CreatePostDesc}</p>
        </div>

        {/* 서버 에러 메시지 표시 */}
        {(serverState?.message || clientErrors.root?.server?.message) && (
          <div
            className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium animate-pulse"
            aria-live="polite"
          >
            <XCircle size={18} />
            {serverState?.message || clientErrors.root?.server?.message}
          </div>
        )}

        {/* 파일 업로드 영역 */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            {UI_TEXT.UploadPhoto}
            <span className="text-blue-500 text-xs font-normal">
              {UI_TEXT.Required}
            </span>
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
              ${
                /* ⭐️ 클라이언트/서버 에러 둘 다 체크 */ clientErrors.root
                  ?.images || serverState?.fieldErrors?.images
                  ? "border-red-300 bg-red-50"
                  : ""
              }
            `}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            {/* ... 아이콘 및 텍스트 기존과 동일 ... */}
            <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-blue-500 transition-colors">
              <div className="p-3 bg-gray-50 rounded-full group-hover:bg-blue-100 transition-colors">
                <ImagePlus size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {UI_TEXT.ClickToUpload}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {UI_TEXT.DragAndDrop}
                </p>
              </div>
            </div>
          </div>

          {/* ⭐️ 에러 메시지 우선순위: 클라이언트 -> 서버 */}
          {(clientErrors.root?.images || serverState?.fieldErrors?.images) && (
            <p className="text-xs text-red-500 font-medium pl-1">
              *{" "}
              {clientErrors.root?.images?.message ||
                serverState?.fieldErrors?.images}
            </p>
          )}

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
            {UI_TEXT.EnterCaption}
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 text-gray-400">
              <FileText size={18} />
            </div>
            <textarea
              id="caption"
              rows={4}
              // ⭐️ register 적용
              {...register("caption")}
              className={`
                w-full pl-10 p-3 bg-gray-50 border rounded-xl outline-none transition-all resize-none
                focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                ${
                  /* ⭐️ 에러 바인딩 */ clientErrors.caption ||
                  serverState?.fieldErrors?.caption
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-200"
                }
              `}
              placeholder={UI_TEXT.CaptionPlaceholder}
            />
          </div>
          {/* ⭐️ 에러 메시지 표시 */}
          {(clientErrors.caption || serverState?.fieldErrors?.caption) && (
            <p className="text-xs text-red-500 font-medium pl-1">
              *{" "}
              {clientErrors.caption?.message ||
                serverState?.fieldErrors?.caption}
            </p>
          )}
        </div>

        {/* 위치 입력 */}
        <div className="space-y-2">
          <label
            htmlFor="locationName"
            className="block text-sm font-semibold text-gray-700"
          >
            {UI_TEXT.AddLocation}{" "}
            <span className="text-gray-400 text-xs font-normal">
              {UI_TEXT.Optional}
            </span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <MapPin size={18} />
            </div>
            <input
              type="text"
              id="locationName"
              // ⭐️ register 적용
              {...register("locationName")}
              className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder={UI_TEXT.LocationPlaceholder}
            />
          </div>
        </div>

        {/* 제출 버튼 */}
        <button type="submit" disabled={isPending} className="...">
          {/* ... 버튼 내용 동일 ... */}
          {isPending ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              {UI_TEXT.Posting}
            </>
          ) : (
            UI_TEXT.Share
          )}
        </button>
      </form>
    </div>
  );
}
