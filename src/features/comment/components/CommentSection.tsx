"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "@/shared/hooks/useIntersectionObserver";
import Image from "next/image";
import { Loader2 } from "lucide-react"; // 로딩 아이콘 (없으면 아무거나 대체)
import { getCommentsForQuery } from "../actions";
import Comment from "./Comment"

interface Props {
  postId: string;
}

export default function CommentSection({ postId }: Props) {
  // 1. useInfiniteQuery 훅 사용
  const {
    data, // 로드된 모든 페이지 데이터
    fetchNextPage, // 다음 페이지 부르는 함수
    hasNextPage, // 다음 페이지 존재 여부 (boolean)
    isFetchingNextPage, // 추가 로딩 중인지 여부
    status,
  } = useInfiniteQuery({
    queryKey: ["comments", postId], // 서버 컴포넌트와 키가 같아야 함!
    queryFn: ({ pageParam }) => getCommentsForQuery({ postId, pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor, // 다음 요청에 쓸 커서 추출
  });

  // 2. 스크롤 감지 로직 연결
  const observerRef = useIntersectionObserver(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });

  // 3. 데이터 평탄화 (pages 배열 -> 하나의 댓글 리스트로)
  // data.pages[0].data, data.pages[1].data ... 이렇게 되어있는걸 쫙 폅니다.
  const comments = data?.pages.flatMap((page) => page.data) ?? [];

  if (status === "error")
    return (
      <div className="p-4 text-red-500">댓글을 불러오는데 실패했습니다.</div>
    );

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 댓글 리스트 렌더링 */}
      {comments.map((comment) => <Comment key={comment.id} comment={comment} />)}

      {/* 무한 스크롤 트리거 (로딩 바) */}
      <div
        ref={observerRef}
        className="h-10 flex justify-center items-center w-full mt-2"
      >
        {isFetchingNextPage && (
          <Loader2 className="animate-spin text-gray-400 w-5 h-5" />
        )}
      </div>

      {!hasNextPage && comments.length > 0 && (
        <div className="text-center text-xs text-gray-400 py-4">
          모든 댓글을 불러왔습니다.
        </div>
      )}
    </div>
  );
}
