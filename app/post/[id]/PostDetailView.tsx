"use client"; // 이 컴포넌트가 클라이언트 측에서 실행됨을 선언합니다.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IPostPopulated } from "@/models/Post.model";

// 서버 컴포넌트로부터 전달받을 props의 타입을 정의합니다.
interface Props {
  post: IPostPopulated;
}

export default function PostDetailView({ post }: Props) {
  // 현재 보여지고 있는 이미지의 인덱스를 상태로 관리합니다.
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = post.images.length > 1;

  // 이전 이미지 보기 함수
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? post.images.length - 1 : prev - 1
    );
  };

  // 다음 이미지 보기 함수
  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === post.images.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <article className="flex flex-col md:flex-row border rounded-lg overflow-hidden bg-white">
        {/* 이미지 영역 */}
        <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative">
          {post.images.length > 0 && (
            <div className="relative w-full aspect-square">
              <Image
                src={post.images[currentImageIndex]}
                alt={`Post image ${currentImageIndex + 1}`}
                fill
                className="object-contain"
                priority
              />
            </div>
          )}

          {/* 이미지가 여러 개일 경우에만 이전/다음 버튼을 표시합니다. */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 hover:bg-white text-gray-800 z-10"
                aria-label="Previous image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>

              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 hover:bg-white text-gray-800 z-10"
                aria-label="Next image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>

              {/* 이미지 인디케이터 (선택 사항) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {post.images.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      index === currentImageIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="w-full md:w-2/5 p-4 flex flex-col">
          {/* 작성자 정보 (이전 코드 유지) */}
          <div className="flex items-center gap-3 pb-4 border-b">
            {post.author.profileImage && (
              <Image
                src={post.author.profileImage}
                alt={post.author.username}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="font-bold">{post.author.username}</span>
          </div>

          {/* 본문 및 위치 정보 (이전 코드 유지) */}
          <div className="py-4 flex-grow">
            {post.location && (
              <p className="text-xs text-gray-500 mb-2">{post.location}</p>
            )}
            <p className="text-sm">
              <span className="font-bold mr-2">{post.author.username}</span>
              {post.caption}
            </p>
          </div>

          {/* 메타 데이터 및 액션 버튼 */}
          <div className="pt-4 border-t text-xs">
            {/* 좋아요 개수 및 좋아요 누른 사람 보기 */}
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-black">
                좋아요 {post.likes.length}개
              </p>
              {/* 좋아요 누른 사람 보기 버튼 (추후 모달 트리거로 사용) */}
              {post.likes.length > 0 && (
                <button
                  // onClick={/* 여기에 모달 열기 함수를 연결하세요 */}
                  className="font-semibold text-gray-500 hover:text-gray-900"
                >
                  좋아요 누른 사람 보기
                </button>
              )}
            </div>
            <p className="text-gray-400">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
