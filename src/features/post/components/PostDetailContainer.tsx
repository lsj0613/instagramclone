import "server-only";
import { getCurrentUser } from "@/services/user.service";
import { getPostInfo } from "@/services/post.service";
import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/shared/constants";
import PostDetailView from "./PostDetailView";
import "server-only";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import CommentSection from "@/features/comment/components/CommentSection";
import { getCommentsService } from "@/services/comment.service";


export default async function PostDetailContainer({
  postId,
}: {
  postId: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect(ROUTES.LOGIN);

  const queryClient = new QueryClient();

  // 게시물 정보와 댓글 프리페칭을 동시에 실행
  const [post] = await Promise.all([
    getPostInfo(postId, currentUser.id),
    queryClient.prefetchInfiniteQuery({
      queryKey: ["comments", postId],
      queryFn: () => getCommentsService({ postId: postId, currentUserId: currentUser.id, cursorId: undefined }),
      initialPageParam: undefined,
    }),
  ]);

  if (!post) notFound();
  console.log(post);

  return (
    <PostDetailView post={post}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CommentSection postId={postId} />
      </HydrationBoundary>
    </PostDetailView>
  );
}