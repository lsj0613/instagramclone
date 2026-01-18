import { Suspense } from "react";
import PostDetailContainer from "@/features/post/components/PostDetailContainer";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  if (!id) notFound();
  return (
    // ⭐️ 레이아웃(배경색, 중앙 정렬)은 페이지가 담당
    <div className="flex justify-center items-center min-h-[calc(100vh-80px)] py-4 sm:py-8 bg-gray-50">
      {/* ⭐️ 데이터 로딩 중 보여줄 UI (스켈레톤이나 로딩 스피너) */}
      <Suspense
        fallback={<div className="text-gray-500">게시물을 불러오는 중...</div>}
      >
        <PostDetailContainer postId={id} />
      </Suspense>
    </div>
  );
}
