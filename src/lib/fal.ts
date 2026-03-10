import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

export interface GenerateResult {
  index: number;
  url: string;
}

export async function generateImage(
  prompt: string,
  styleKeywords: string | null,
  index: number
): Promise<GenerateResult> {
  // 화풍 키워드를 프롬프트에 주입 (구도 복사 없이 스타일만 반영)
  const fullPrompt = styleKeywords
    ? `${prompt}, ${styleKeywords}, single panel only, no comic grid, no multiple panels`
    : `${prompt}, cartoon style, simple line art, warm colors, single panel only`;

  const result = await fal.run("fal-ai/flux/schnell", {
    input: {
      prompt: fullPrompt,
      num_inference_steps: 4,
      num_images: 1,
      image_size: "square",
      enable_safety_checker: false,
    },
  }) as { images?: { url: string }[] };

  const url = result?.images?.[0]?.url;
  if (!url) {
    throw new Error(
      `이미지 URL 없음 (컷 ${index}) — 응답: ${JSON.stringify(result).slice(0, 200)}`
    );
  }

  return { index, url };
}

export async function generateAllImages(
  prompts: string[],
  styleKeywords: string | null
): Promise<GenerateResult[]> {
  const results = await Promise.all(
    prompts.map((prompt, i) => generateImage(prompt, styleKeywords, i + 1))
  );
  return results;
}
