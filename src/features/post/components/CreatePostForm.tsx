"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPostAction } from "@/features/post/actions";
import ImagePreview from "./ImagePreview";
import {
  Loader2,
  MapPin,
  ImagePlus,
  XCircle,
  FileText,
  Plus,
  AlertCircle,
} from "lucide-react";
import { uploadToCloudinaryClient } from "@/shared/utils/upload";
import { UI_TEXT } from "@/shared/constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useExitGuard } from "@/shared/hooks/use-exit-guard";

// 1. 클라이언트 폼 스키마
const ClientFormSchema = z.object({
  caption: z.string().max(2200),
  locationName: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // ⭐️ [변경 1] 깔끔하게 string으로 변경 (에러 메시지 전용)
  images: z.string().optional(),
});

type ClientFormType = z.infer<typeof ClientFormSchema>;

export default function CreatePostForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
    setError,
    clearErrors,
  } = useForm<ClientFormType>({
    resolver: zodResolver(ClientFormSchema),
  });

  // ⭐️ [확인] 이제 여기서 errors.images를 읽으면 정확히 연결됩니다.
  const imageErrorMessage = errors.images?.message;

  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const isDataTouched = isDirty || files.length > 0;
  useExitGuard(isDataTouched);

  const onSubmit = async (data: ClientFormType) => {
    if (files.length === 0) {
      // ⭐️ [변경 2] root.images -> images (정식 필드 사용)
      setError("images", {
        type: "manual",
        message: "이미지는 최소 1장 필요합니다.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = files.map((file) =>
        uploadToCloudinaryClient(file)
      );
      const uploadedImages = await Promise.all(uploadPromises);

      const payload = {
        ...data, // 폼 입력값 (caption, location 등)
        images: uploadedImages, // 이미지 URL 배열 (string[])
      };

      const result = await createPostAction(null, payload);

      if (result?.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([key, msg]) => {
          // images 키가 와도 스키마에 string으로 정의돼 있어서 OK!
          setError(key as keyof ClientFormType, {
            message: Array.isArray(msg) ? msg[0] : msg,
          });
        });
      } else if (result?.message) {
        setError("root.server", { message: result.message });
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setError("root.server", { message: "네트워크 오류가 발생했습니다." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    // ⭐️ [변경 3] root.images -> images
    clearErrors("images");

    const validFiles = Array.from(newFiles).filter((file) =>
      file.type.startsWith("image/")
    );
    if (validFiles.length === 0) return;

    const uniqueFiles = validFiles.filter((newFile) => {
      const isDuplicate = files.some(
        (existingFile) =>
          existingFile.name === newFile.name &&
          existingFile.size === newFile.size
      );
      return !isDuplicate;
    });

    if (uniqueFiles.length < validFiles.length) {
      // ⭐️ [변경 4] root.images -> images
      setError("images", {
        type: "manual",
        message: "이미 추가된 사진은 제외되었습니다.",
      });
    }

    if (uniqueFiles.length === 0) return;
    setFiles((prev) => [...prev, ...uniqueFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-xl mx-auto py-8">
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

        {/* 서버 에러 (root.server) */}
        {errors.root?.server?.message && (
          <div
            className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium animate-pulse"
            aria-live="polite"
          >
            <XCircle size={18} />
            {errors.root.server.message}
          </div>
        )}

        {/* 이미지 섹션 */}
        <div className="space-y-4 relative">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              {UI_TEXT.UploadPhoto}
              <span className="text-blue-500 text-xs font-normal ml-1">
                {UI_TEXT.Required}
              </span>
            </label>
            {files.length > 0 && (
              <span className="text-xs text-gray-400">
                {files.length}장 선택됨
              </span>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />

          {files.length === 0 ? (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative group flex flex-col items-center justify-center p-14 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer
                ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                    : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                }
                ${imageErrorMessage ? "border-red-300 bg-red-50" : ""}
              `}
            >
              <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-blue-500 transition-colors">
                <div className="p-4 bg-gray-50 rounded-full group-hover:bg-blue-100 transition-colors">
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
          ) : (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`
                grid grid-cols-3 sm:grid-cols-4 gap-3 p-2 rounded-2xl border-2 border-transparent transition-all duration-200
                ${isDragging ? "border-blue-500 bg-blue-50/30" : ""}
              `}
            >
              {files.map((file, index) => (
                <ImagePreview
                  key={file.name + file.size + index}
                  file={file}
                  onRemove={() => removeImage(index)}
                />
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-all"
              >
                <Plus size={24} />
                <span className="text-xs font-medium mt-1">추가</span>
              </button>
            </div>
          )}

          {/* 에러 메시지 표시 */}
          <div
            className={`
              absolute left-0 -bottom-6 w-full
              flex items-center gap-1.5 pl-1
              transition-opacity duration-300 ease-in-out
              ${imageErrorMessage ? "opacity-100" : "opacity-0"}
            `}
          >
            {imageErrorMessage && (
              <>
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span className="text-xs text-red-500 font-medium leading-none pt-[2px]">
                  {imageErrorMessage}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 캡션 입력 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            {UI_TEXT.EnterCaption}
            <span className="text-blue-500 text-xs font-normal ml-1">
              {UI_TEXT.Required}
            </span>
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 text-gray-400">
              <FileText size={18} />
            </div>
            <textarea
              rows={4}
              {...register("caption")}
              className={`w-full pl-10 p-3 bg-gray-50 border rounded-xl outline-none transition-all resize-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                errors.caption
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-200"
              }`}
              placeholder={UI_TEXT.CaptionPlaceholder}
            />
          </div>
          {errors.caption && (
            <p className="text-xs text-red-500 font-medium pl-1">
              * {errors.caption.message}
            </p>
          )}
        </div>

        {/* 위치 입력 */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
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
              {...register("locationName")}
              className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder={UI_TEXT.LocationPlaceholder}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className={`
            w-full flex items-center justify-center py-4 rounded-xl font-bold text-white text-lg transition-all duration-200 shadow-md
            ${
              isUploading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 hover:shadow-lg active:scale-[0.98]"
            }
          `}
        >
          {isUploading ? (
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
