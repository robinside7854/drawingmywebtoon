import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

export interface GenerateResult {
  index: number;
  url: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUrl(result: any): string | undefined {
  // 가능한 응답 구조들을 모두 시도
  return (
    result?.images?.[0]?.url ||
    result?.image?.url ||
    result?.output?.images?.[0]?.url ||
    result?.data?.images?.[0]?.url ||
    result?.url
  );
}

export async function generateImage(
  prompt: string,
  styleImageUrl: string | null,
  index: number
): Promise<GenerateResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;

  if (styleImageUrl) {
    result = await fal.run("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: styleImageUrl,
        prompt: prompt,
        strength: 0.75,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false,
      },
    });
  } else {
    result = await fal.run("fal-ai/flux/schnell", {
      input: {
        prompt: prompt,
        num_inference_steps: 4,
        num_images: 1,
        image_size: "square",
        enable_safety_checker: false,
      },
    });
  }

  const url = extractUrl(result);

  // URL을 못 찾으면 실제 응답 구조를 에러에 포함해 디버깅
  if (!url) {
    throw new Error(
      `이미지 URL 없음 (컷 ${index}) — 응답: ${JSON.stringify(result).slice(0, 300)}`
    );
  }

  return { index, url };
}

export async function generateAllImages(
  prompts: string[],
  styleImageUrl: string | null
): Promise<GenerateResult[]> {
  const results = await Promise.all(
    prompts.map((prompt, i) => generateImage(prompt, styleImageUrl, i + 1))
  );
  return results;
}
