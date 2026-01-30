import "server-only";
import { getCurrentUser } from "@/features/user/service";
import { getPostDetail } from "../service";
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
import CommentInput from "@/features/comment/components/CommentInput";
import { getComments } from "@/features/comment/service";

export default async function PostDetailContainer({
  postId,
}: {
  postId: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect(ROUTES.LOGIN);

  const queryClient = new QueryClient();

  // 게시물 정보와 댓글 프리페칭을 동시에 실a행
  const [post] = await Promise.all([
    getPostDetail({ postId: postId, currentUserId: currentUser.id }),
    queryClient.prefetchInfiniteQuery({
      queryKey: ["comments", postId],
      queryFn: () =>
        getComments({
          postId: postId,
          limit: 20,
          currentUserId: currentUser.id,
          cursorId: undefined,
        }),
      initialPageParam: undefined,
    }),
  ]);

  if (!post) notFound();
  console.log(post);

  const commentSection = (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CommentSection postId={postId} />
    </HydrationBoundary>
  );

  const commentInput = (
    <CommentInput postId={postId} currentUser={currentUser} />
  );

  return (
    <PostDetailView
      post={post}
      CommentSection={commentSection}
      CommentInput={commentInput}
    />
  );
}
