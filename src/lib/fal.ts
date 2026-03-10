export interface GenerateResult {
  index: number;
  url: string;
}

export async function generateImage(
  prompt: string,
  styleKeywords: string | null,
  index: number
): Promise<GenerateResult> {
  const fullPrompt = styleKeywords
    ? `${prompt}, ${styleKeywords}, single panel only, no comic grid, no multiple panels`
    : `${prompt}, cartoon style, simple line art, warm colors, single panel only`;

  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      "Authorization": `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      num_inference_steps: 4,
      num_images: 1,
      image_size: "square",
      enable_safety_checker: false,
    }),
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
  styleKeywords: string | null
): Promise<GenerateResult[]> {
  const results = await Promise.all(
    prompts.map((prompt, i) => generateImage(prompt, styleKeywords, i + 1))
  );
  return results;
}
