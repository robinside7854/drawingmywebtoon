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

export interface StyleAnalysis {
  stylePrompt: string;   // 생성 프롬프트에 추가할 스타일 키워드
  negativePrompt: string; // 제외할 요소
}

// 화풍 이미지를 Claude Vision으로 분석 → 스타일 + 네거티브 프롬프트 추출
export async function analyzeStyle(base64Image: string, mimeType: string): Promise<StyleAnalysis> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
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
            text: `이 웹툰/만화 이미지를 분석해서 아래 JSON 형식으로만 응답하세요 (마크다운 없이):

{
  "characterType": "캐릭터 종류 (예: cute animal characters, human characters, chibi humans)",
  "artStyle": "선 스타일 (예: thick black outlines, clean vector lines, sketchy lines)",
  "colorPalette": "색감 (예: flat colors, pastel palette, warm muted tones)",
  "designFeatures": "특징적 디자인 (예: round heads, small noses, expressive eyes, simplified features)",
  "negativeElements": "이 화풍에 없는 것들 (예: realistic proportions, detailed shading, photorealistic)"
}

분석 기준:
- characterType: 가장 중요. 동물이면 반드시 animal로 명시
- 사람이면 human으로 명시, 치비면 chibi로 명시
- 구도나 스토리 내용은 완전히 무시하고 시각적 스타일만 분석`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    const stylePrompt = [
      parsed.characterType,
      parsed.artStyle,
      parsed.colorPalette,
      parsed.designFeatures,
      "single panel only, no comic grid",
    ].filter(Boolean).join(", ");

    const negativePrompt = [
      parsed.negativeElements,
      // 동물 캐릭터 화풍이면 사람 생성 방지
      parsed.characterType?.toLowerCase().includes("animal")
        ? "human face, realistic human, photorealistic"
        : "",
      "multiple panels, comic grid, 4-panel layout, text overlay, speech bubbles",
    ].filter(Boolean).join(", ");

    return { stylePrompt, negativePrompt };
  } catch {
    return {
      stylePrompt: "cartoon style, simple line art, flat colors, single panel only",
      negativePrompt: "multiple panels, comic grid, photorealistic",
    };
  }
}
