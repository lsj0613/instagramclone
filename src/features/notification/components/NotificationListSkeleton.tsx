export default function NotificationListSkeleton() {
  const skeletonItems = Array.from({ length: 12 });

  return (
    <div className="flex flex-col animate-pulse pb-4">
      {skeletonItems.map((_, index) => {
        // 텍스트 길이 랜덤화 (2줄 느낌 혹은 1줄 느낌)
        const isTwoLine = index % 3 !== 0; // 2/3 확률로 2줄
        const widthClass = ["w-3/4", "w-5/6", "w-full"][index % 3];

        return (
          // 실제 알림과 동일한 padding, gap, align 적용
          <div key={index} className="flex w-full items-start gap-3 px-4 py-3">
            {/* 프로필 이미지 자리 (mt-0.5 포함) */}
            <div className="h-11 w-11 shrink-0 rounded-full bg-gray-200 mt-0.5" />

            {/* 텍스트 영역 자리 */}
            <div className="flex flex-1 flex-col justify-center min-h-[44px] gap-1.5">
              {/* 첫 줄 (항상 존재 - 유저네임 부분) */}
              <div className="h-3.5 w-1/3 rounded bg-gray-200" />

              {/* 둘째 줄 (본문 내용 시뮬레이션) */}
              <div className={`h-3.5 rounded bg-gray-200 ${widthClass}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
