import { getPostById } from "@/actions/GetPostById";
import { notFound } from "next/navigation";
import PostDetailView from "./PostDetailView"; // 클라이언트 컴포넌트 import

interface Props {
  params: Promise<{ id: string }>;
}

// 이 컴포넌트는 서버에서 데이터를 가져오는 역할만 수행합니다.
export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const response = await getPostById(id);

  if (!response.success || !response.data) {
    notFound();
  }

  // 데이터를 클라이언트 컴포넌트에 props로 전달합니다.
  return <PostDetailView post={response.data} />;
}
