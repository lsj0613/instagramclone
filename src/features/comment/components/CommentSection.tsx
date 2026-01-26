"use client";

import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer"; // ⭐️ 라이브러리 사용
import { Loader2 } from "lucide-react";
import Comment from "./Comment";
import { fetchComments } from "../api/get-comments";

interface Props {
  postId: string;
}

export default function CommentSection({ postId }: Props) {
  // 1. 데이터 가져오기 (기존과 동일)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["comments", postId],
      queryFn: ({ pageParam }) => fetchComments({ postId, pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  // 2. ⭐️ 무한 스크롤 감지 로직 (라이브러리 사용으로 매우 간단해짐)
  // ref: 이 요소가 화면에 보이면
  // inView: true로 바뀜
  const { ref, inView } = useInView();

  // 화면에 바닥(ref)이 보이고 + 다음 페이지가 있다면 -> 데이터 더 가져와라
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // 3. 에러 처리
  if (status === "error") {
    console.log(status);

    return (
      <div className="p-4 text-red-500">댓글을 불러오는데 실패했습니다.</div>
    );
  }

  const comments = data?.pages.flatMap((page) => page.comments) ?? [];

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 댓글 리스트 */}
      {comments.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}

      {/* 4. ⭐️ 수정 포인트: 데이터가 더 있을 때만 감지 영역(높이)을 렌더링 */}
      {hasNextPage && (
        <div
          ref={ref}
          className="h-10 flex justify-center items-center w-full mt-2"
        >
          {isFetchingNextPage && (
            <Loader2 className="animate-spin text-gray-400 w-5 h-5" />
          )}
        </div>
      )}

      {/* ⭐️ 수정 포인트: py-4 -> py-2로 줄임 */}
      {!hasNextPage && comments.length > 0 && (
        <div className="text-center text-xs text-gray-400 py-2">
          모든 댓글을 불러왔습니다.
        </div>
      )}
    </div>
  );
}
