import { GetCommentsResponse } from "@/services/comment.service";


export const getComments = async ({
  postId,
  pageParam,
}: {
  postId: string;
  pageParam?: string;
}) => {  

const params = new URLSearchParams();
params.append("postId", postId);

// pageParam이 존재하고, "undefined" 문자열이 아닐 때만 추가
if (pageParam && pageParam !== "undefined") {
  params.append("cursor", pageParam);
}

const response = await fetch(`/api/comments?${params.toString()}`, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});
  if (!response.ok) throw new Error("Failed to fetch comments");

  return response.json() as Promise<GetCommentsResponse>;
};
