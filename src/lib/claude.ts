import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Scene {
  index: number;
  label: "기" | "승" | "전" | "결";
  summary: string;
  prompt: string;
}

export interface AnalyzeResult {
  scenes: Scene[];
  characterSeed: string;
}

export async function analyzeDiary(diary: string): Promise<AnalyzeResult> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `당신은 일기를 네컷 만화 스토리로 변환하는 전문가입니다.

아래 일기를 기-승-전-결 4장면으로 분리하고, 각 장면의 이미지 생성 프롬프트를 영어로 작성해주세요.

일기:
${diary}

다음 JSON 형식으로만 응답하세요 (마크다운 없이 순수 JSON):
{
  "scenes": [
    {
      "index": 1,
      "label": "기",
      "summary": "장면 한 줄 설명 (한국어)",
      "prompt": "image generation prompt in English, cartoon style, simple, 1:1 square, warm colors"
    },
    {
      "index": 2,
      "label": "승",
      "summary": "장면 한 줄 설명 (한국어)",
      "prompt": "image generation prompt in English, cartoon style, simple, 1:1 square, warm colors"
    },
    {
      "index": 3,
      "label": "전",
      "summary": "장면 한 줄 설명 (한국어)",
      "prompt": "image generation prompt in English, cartoon style, simple, 1:1 square, warm colors"
    },
    {
      "index": 4,
      "label": "결",
      "summary": "장면 한 줄 설명 (한국어)",
      "prompt": "image generation prompt in English, cartoon style, simple, 1:1 square, warm colors"
    }
  ],
  "characterSeed": "주인공 외모 묘사 (영어, 예: young woman, casual clothes, short black hair)"
}

프롬프트 작성 규칙:
- 4장면에서 동일한 캐릭터(characterSeed)가 등장해야 함
- 각 장면의 분위기와 감정을 명확히 표현
- "cartoon style, simple line art, warm colors" 를 모든 프롬프트에 포함`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as AnalyzeResult;
}
