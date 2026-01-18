import "server-only";

import { getCurrentUser } from "@/services/user.service";
import { getPostInfo } from "@/services/post.service";
import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/shared/constants";
import PostDetailView from "./PostDetailView";

interface Props {
  postId: string;
}

export default async function PostDetailContainer({ postId }: Props) {
  // 1. 사용자 인증 (서버에서 먼저 체크)
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect(ROUTES.LOGIN);
  }

  // 2. 데이터 조회
  const post = await getPostInfo(postId, currentUser.id);

  // 3. 404 처리
  if (!post) {
    notFound();
  }

  // 4. 뷰 컴포넌트에 데이터 주입 (Presenter 패턴)
  return <PostDetailView post={post} />;
}
