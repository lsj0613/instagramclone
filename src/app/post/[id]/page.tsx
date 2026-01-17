import { notFound, redirect } from "next/navigation";
import PostDetailView from "@/features/post/components/PostDetailView"; // 클라이언트 컴포넌트 import
import { auth } from "@/lib/auth";
import { getPostInfo } from "@/services/post.service";

interface Props {
  params: Promise<{ id: string }>;
}

// 이 컴포넌트는 서버에서 데이터를 가져오는 역할만 수행합니다.
export default async function PostWrapper({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const response = await getPostInfo(id, session.user.id);
  if (!response) {
    notFound();
  }

  // 데이터를 클라이언트 컴포넌트에 props로 전달합니다.
  return <PostDetailView post={response} currentUser={session.user} />;
}
