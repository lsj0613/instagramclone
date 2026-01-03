
export default function NotificationSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {/* 프로필 이미지 스켈레톤 */}
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            {/* 텍스트 스켈레톤 */}
            <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}