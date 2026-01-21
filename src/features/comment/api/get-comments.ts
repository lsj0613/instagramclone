import { GetCommentsResponse } from "@/services/comment.service";


export const getComments = async ({
  postId,
  pageParam,
}: {
  postId: string;
  pageParam?: string;
}) => {
  const cursor = pageParam ?? 0;

  const res = await fetch(`/api/comments?postId=${postId}&cursor=${cursor}`);

  if (!res.ok) throw new Error("Failed to fetch comments");

  return res.json() as Promise<GetCommentsResponse>;
};
