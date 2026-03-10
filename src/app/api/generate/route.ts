import { NextRequest, NextResponse } from "next/server";
import { generateAllImages } from "@/lib/fal";
import { analyzeStyle } from "@/lib/claude";
import { Scene } from "@/lib/claude";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const scenesJson = formData.get("scenes") as string;
    const styleFile = formData.get("styleImage") as File | null;

    if (!scenesJson) {
      return NextResponse.json({ error: "scenes 데이터가 없습니다." }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }

    const scenes: Scene[] = JSON.parse(scenesJson);
    const prompts = scenes.map((s) => s.prompt);

    // 화풍 이미지 → Claude Vision으로 스타일 키워드 추출
    let styleKeywords: string | null = null;
    if (styleFile && styleFile.size > 0) {
      const buffer = await styleFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      styleKeywords = await analyzeStyle(base64, styleFile.type || "image/jpeg");
    }

    const images = await generateAllImages(prompts, styleKeywords);
    return NextResponse.json({ images, styleKeywords });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[generate]", msg);
    return NextResponse.json(
      { error: `이미지 생성 오류: ${msg}` },
      { status: 500 }
    );
  }
}
