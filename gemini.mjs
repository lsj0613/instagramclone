import { GoogleGenerativeAI } from "@google/generative-ai";
import readline from "readline";
import dotenv from "dotenv";
import fs from "fs";

// 1. 환경변수 설정 (.env.local 우선)
const envConfig = fs.existsSync(".env.local") ? { path: ".env.local" } : {};
dotenv.config(envConfig);

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ 오류: API 키가 없습니다. .env 파일을 확인하세요.");
  process.exit(1);
}

// === 🎨 색상 테마 설정 ===
const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
};

const THEME = {
  user: COLORS.yellow, // 사용자 질문
  ai: COLORS.cyan, // AI 답변
  system: COLORS.gray, // 시스템 메시지
  loader: COLORS.magenta, // 로딩바
  error: COLORS.red, // 에러
};
// ========================

// ⚡ 모델 설정: 속도와 최신 정보를 위해 2.5 Flash 사용
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 채팅 초기 설정 (페르소나)
const chat = model.startChat({
  history: [
    {
      role: "user",
      parts: [
        {
          text: "너는 유능한 개발자 어시스턴트야. 명확하고 간결하게, 코드 위주로 답변해.",
        },
      ],
    },
  ],
});

console.clear();
console.log(
  `${THEME.system}%s${COLORS.reset}`,
  "=== Gemini Terminal Mode (종료: Ctrl+C 또는 exit) ==="
);

// --- ⏳ 로딩 애니메이션 ---
let loadingInterval;
function startLoading() {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  process.stdout.write("\x1b[?25l"); // 커서 숨김
  loadingInterval = setInterval(() => {
    process.stdout.write(
      `\r${THEME.loader}${frames[i]} 답변 생성 중...${COLORS.reset}`
    );
    i = (i + 1) % frames.length;
  }, 80);
}
function stopLoading() {
  clearInterval(loadingInterval);
  process.stdout.write("\r\x1b[K\x1b[?25h"); // 줄 지우고 커서 복구
}
// -----------------------

function ask() {
  rl.question(`\n${THEME.user}User > ${COLORS.reset}`, async (input) => {
    const trimmedInput = input.trim().toLowerCase();

    // 종료 조건
    if (trimmedInput === "exit" || trimmedInput === "quit") {
      rl.close();
      process.exit(0);
      return;
    }

    if (!input) {
      ask();
      return;
    }

    startLoading();

    try {
      const result = await chat.sendMessageStream(input);
      stopLoading();

      process.stdout.write(`${THEME.ai}Gemini > ${COLORS.reset}`);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        process.stdout.write(`${THEME.ai}${chunkText}${COLORS.reset}`);
      }
      console.log(); // 답변 끝 줄바꿈
    } catch (error) {
      stopLoading();
      console.error(
        `\n${THEME.error}❌ Error: ${error.message}${COLORS.reset}`
      );
    }

    ask();
  });
}

ask();
