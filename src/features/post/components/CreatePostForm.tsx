"use client";

import {
  useState,
  useRef,
  useActionState,
  startTransition,
  useEffect,
} from "react";
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
import { CreatePostSchema } from "@/shared/utils/validation";
import z from "zod";
import { useExitGuard } from "@/shared/hooks/use-exit-guard";

const ClientFormSchema = CreatePostSchema.pick({
  caption: true,
  locationName: true,
});

type ClientFormType = z.infer<typeof ClientFormSchema>;

export default function CreatePostForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [serverState, formAction, isActionPending] = useActionState(
    createPostAction,
    null
  );

  const {
    register,
    handleSubmit,
    formState: { isDirty, errors: clientErrors },
    setError,
    clearErrors,
  } = useForm<ClientFormType>({
    resolver: zodResolver(ClientFormSchema),
  });
  const [isUploading, setIsUploading] = useState(false);
  const isPending = isUploading || isActionPending;
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const isDataTouched = isDirty || files.length > 0;
  useExitGuard(isDataTouched);

  // 알림 상태
  const [alertState, setAlertState] = useState<{
    show: boolean;
    message: string;
  }>({
    show: false,
    message: "",
  });

  // 알림 자동 숨김 타이머
  useEffect(() => {
    if (alertState.show) {
      const timer = setTimeout(() => {
        setAlertState((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alertState.show]);

  const onSubmit = async (data: ClientFormType) => {
    if (files.length === 0) {
      setError("root.images", {
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
      const imageUrls = await Promise.all(uploadPromises);

      const formData = new FormData();
      formData.append("caption", data.caption);
      if (data.locationName) {
        formData.append("locationName", data.locationName);
      }
      imageUrls.forEach((url) => {
        formData.append("images", url);
      });

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

    setAlertState((prev) => ({ ...prev, show: false }));

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

    // 중복 발생 시 알림 표시
    if (uniqueFiles.length < validFiles.length) {
      setTimeout(() => {
        setAlertState({
          show: true,
          message: "이미 추가된 사진은 제외되었습니다.",
        });
      }, 50);
    }

    if (uniqueFiles.length === 0) return;

    setFiles((prev) => [...prev, ...uniqueFiles]);
    clearErrors("root.images");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트가 window로 퍼지는 것을 방지
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 자식 요소로 마우스가 들어갔을 때의 leave 처리
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 브라우저의 기본 파일 열기 동작을 여기서 최종적으로 가로챔
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const hasImageError =
    !!clientErrors.root?.images || !!serverState?.fieldErrors?.images;

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

        {(serverState?.message || clientErrors.root?.server?.message) && (
          <div
            className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium animate-pulse"
            aria-live="polite"
          >
            <XCircle size={18} />
            {serverState?.message || clientErrors.root?.server?.message}
          </div>
        )}

        {/* ⭐️ 이미지 섹션: relative 필수 */}
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
                ${hasImageError ? "border-red-300 bg-red-50" : ""}
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

          {/* ⭐️ [핵심 수정] 
            absolute와 -bottom-6을 사용하여 '아래쪽 여백 공간'에 메시지를 띄웁니다.
            공간을 차지하지 않으므로 레이아웃이 밀리지 않습니다.
          */}
          <div
            className={`
              absolute left-0 -bottom-6 w-full
              flex items-center gap-1.5 text-sm font-medium text-red-600 pl-1
              transition-opacity duration-300 ease-in-out
              ${alertState.show ? "opacity-100" : "opacity-0"}
            `}
          >
            {/* 아이콘 위치 미세 조정 */}
            <AlertCircle size={16} className="shrink-0" />

            {/* 텍스트 줄높이 제거(leading-none) 및 1px 아래로 내리기(pt-[1px]) */}
            <span className="leading-none pt-[4px]">{alertState.message}</span>
          </div>

          {hasImageError && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-pulse">
              *{" "}
              {clientErrors.root?.images?.message ||
                serverState?.fieldErrors?.images}
            </p>
          )}
        </div>

        {/* 문구 입력 */}
        <div className="space-y-2">
          <label
            htmlFor="caption"
            className="block text-sm font-semibold text-gray-700"
          >
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
              id="caption"
              rows={4}
              {...register("caption")}
              className={`w-full pl-10 p-3 bg-gray-50 border rounded-xl outline-none transition-all resize-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                clientErrors.caption || serverState?.fieldErrors?.caption
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-200"
              }`}
              placeholder={UI_TEXT.CaptionPlaceholder}
            />
          </div>
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
              {...register("locationName")}
              className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder={UI_TEXT.LocationPlaceholder}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`
            w-full flex items-center justify-center py-4 rounded-xl font-bold text-white text-lg transition-all duration-200 shadow-md
            ${
              isPending
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 hover:shadow-lg active:scale-[0.98]"
            }
          `}
        >
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
