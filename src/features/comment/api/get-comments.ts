export const getComments = async ({
  pageParam,
  postId,
}: {
  pageParam?: number; // undefined일 수도 있다고 명시 (선택사항)
  postId: string;
}) => {
  // ⭐️ [안전장치] pageParam이 없으면 0(첫 페이지)으로 취급
  const cursor = pageParam ?? 0;

  const res = await fetch(`/api/comments?postId=${postId}&cursor=${cursor}`);

  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
};
