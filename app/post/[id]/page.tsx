import { getPostById } from "@/actions/GetPostById";
import { notFound } from "next/navigation";
import PostDetailView from "./PostDetailView"; // 클라이언트 컴포넌트 import

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Loads post data by ID and renders the post detail view; triggers a 404 page if the post is not found.
 *
 * @param params - A promise resolving to an object containing the route `id` string.
 * @returns The JSX element rendering the PostDetailView populated with the fetched post data.
 */
export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const response = await getPostById(id);

  if (!response.success || !response.data) {
    notFound();
  }

  // 데이터를 클라이언트 컴포넌트에 props로 전달합니다.
  return <PostDetailView post={response.data} />;
}