import { Suspense } from "react";
import ProfileContainer from "@/features/user/components/ProfileDetailContainer";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  return (
    // 프로필 페이지는 보통 전체 너비를 쓰므로 별도 레이아웃 스타일은 최소화
    <div className="min-h-[calc(100vh-80px)] bg-white">
      {/* 데이터 로딩 중 보여줄 UI */}
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64 text-gray-500">
            프로필을 불러오는 중...
          </div>
        }
      >
        <ProfileContainer username={username} />
      </Suspense>
    </div>
  );
}
