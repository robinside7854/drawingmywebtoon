import * as fal from "@fal-ai/serverless-client";

fal.config({ credentials: process.env.FAL_KEY });

export interface GenerateResult {
  index: number;
  url: string;
}

export async function generateImage(
  prompt: string,
  styleImageUrl: string | null,
  index: number
): Promise<GenerateResult> {
  let result: { images?: { url: string }[] };

  if (styleImageUrl) {
    // 화풍 이미지가 있을 때: IP-Adapter 사용
    result = await fal.run("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: styleImageUrl,
        prompt: prompt,
        strength: 0.75,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: "square",
        enable_safety_checker: false,
      },
    }) as { images?: { url: string }[] };
  } else {
    // 화풍 이미지 없을 때: 텍스트만으로 생성
    result = await fal.run("fal-ai/flux/schnell", {
      input: {
        prompt: prompt,
        num_inference_steps: 4,
        num_images: 1,
        image_size: "square",
        enable_safety_checker: false,
      },
    }) as { images?: { url: string }[] };
  }

  const url = result?.images?.[0]?.url;
  if (!url) throw new Error(`이미지 생성 실패 (컷 ${index})`);

  return { index, url };
}

export async function generateAllImages(
  prompts: string[],
  styleImageUrl: string | null
): Promise<GenerateResult[]> {
  // 4장 병렬 생성
  const results = await Promise.all(
    prompts.map((prompt, i) => generateImage(prompt, styleImageUrl, i + 1))
  );
  return results;
}
