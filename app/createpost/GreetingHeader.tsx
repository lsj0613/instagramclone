'use client';

import { useState, useEffect } from 'react';

export default function GreetingHeader({ userName }: { userName: string }) {
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    const greetings = [
      "오늘은 어떤 특별한 순간을 기록하고 싶으신가요?",
      "당신의 이야기를 들려주세요.",
      "멋진 사진을 공유해 볼까요?",
      "오늘의 기분을 사진으로 표현해 보세요."
    ];
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold mb-2">
        안녕하세요, {userName}님! 👋
      </h1>
      {/* 클라이언트에서 확정되기 전까지 레이아웃 시프트 방지를 위한 최소 높이 유지 */}
      <p className="text-gray-500 min-h-[1.5rem]">
        {greeting}
      </p>
    </div>
  );
}