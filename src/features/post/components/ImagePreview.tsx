import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react"; // 아이콘 임포트

export default function ImagePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!src) return (
    // 로딩 스켈레톤 추가
    <div className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
  );

  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
      <Image 
        src={src} 
        alt="Preview" 
        fill 
        className="object-cover transition-transform duration-300 group-hover:scale-105" 
        sizes="(max-width: 768px) 33vw, 20vw"
      />
      
      {/* 삭제 버튼 개선: 호버 시 나타나거나 항상 은은하게 표시 */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
        aria-label="Remove image"
      >
        <X size={14} />
      </button>
    </div>
  );
}