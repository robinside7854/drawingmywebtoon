export interface GenerateResult {
  index: number;
  url: string;
}

export async function generateImage(
  prompt: string,
  stylePrompt: string | null,
  negativePrompt: string | null,
  loraUrl: string | null,
  triggerWord: string | null,
  index: number
): Promise<GenerateResult> {
  const loraPrefix = loraUrl && triggerWord ? `${triggerWord}, ` : "";
  const fullPrompt = loraPrefix + (stylePrompt
    ? `${prompt}, ${stylePrompt}`
    : `${prompt}, cartoon style, simple line art, flat colors, single panel only`);

  const negative = negativePrompt ||
    "multiple panels, comic grid, 4-panel layout, photorealistic, text overlay";

  const body: Record<string, unknown> = {
    prompt: fullPrompt,
    negative_prompt: negative,
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    image_size: "square_hd",
    enable_safety_checker: false,
  };

  // 학습된 LoRA 적용
  if (loraUrl) {
    body.loras = [{ path: loraUrl, scale: 1.0 }];
  }

  const response = await fetch("https://fal.run/fal-ai/flux/dev", {
    method: "POST",
    headers: {
      "Authorization": `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fal.ai ${response.status}: ${errText.slice(0, 200)}`);
  }

  const result = await response.json() as { images?: { url: string }[] };
  const url = result?.images?.[0]?.url;

  if (!url) {
    throw new Error(`이미지 URL 없음 (컷 ${index}) — ${JSON.stringify(result).slice(0, 200)}`);
  }

  return { index, url };
}

export async function generateAllImages(
  prompts: string[],
  stylePrompt: string | null,
  negativePrompt: string | null,
  loraUrl: string | null,
  triggerWord: string | null,
): Promise<GenerateResult[]> {
  const results = await Promise.all(
    prompts.map((prompt, i) =>
      generateImage(prompt, stylePrompt, negativePrompt, loraUrl, triggerWord, i + 1)
    )
  );
  return results;
}
