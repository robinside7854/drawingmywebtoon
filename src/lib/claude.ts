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
      "prompt": "image generation prompt in English, single scene, 1:1 square"
    },
    {
      "index": 2,
      "label": "승",
      "summary": "장면 한 줄 설명 (한국어)",
      "prompt": "image generation prompt in English, single scene, 1:1 square"
    },
    {
      "index": 3,
      "label": "전",
      "summary": "장면 한 줄 설명 (한국어)",
      "prompt": "image generation prompt in English, single scene, 1:1 square"
    },
    {
      "index": 4,
      "label": "결",
      "summary": "장면 한 줄 설명 (한국어)",
      "prompt": "image generation prompt in English, single scene, 1:1 square"
    }
  ],
  "characterSeed": "주인공 외모 묘사 (영어, 예: young woman, casual clothes, short black hair)"
}

프롬프트 작성 규칙:
- 반드시 한 장면에 하나의 이미지만 묘사 (네컷 레이아웃 금지)
- 4장면에서 동일한 캐릭터(characterSeed)가 등장
- 각 장면의 분위기와 감정을 명확히 표현`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as AnalyzeResult;
}

// 화풍 이미지를 Claude Vision으로 분석 → 그림체 설명 추출
export async function analyzeStyle(base64Image: string, mimeType: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `이 이미지의 그림체(아트 스타일)를 영어로 설명해주세요.
구도나 스토리 내용은 무시하고, 오직 다음만 추출하세요:
- 선의 굵기와 스타일 (예: thick outlines, clean lines)
- 색감 팔레트 (예: pastel colors, muted tones)
- 캐릭터 디자인 특징 (예: round faces, big eyes, chibi style)
- 전체적인 화풍 키워드

한 줄로, 콤마 구분, 영어로만 응답하세요. 예시: "thick black outlines, pastel colors, chibi characters, round expressive faces, simple backgrounds"`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return text.trim();
}
