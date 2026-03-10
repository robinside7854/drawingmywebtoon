import { NextRequest, NextResponse } from "next/server";
import { generateAllImages } from "@/lib/fal";
import { Scene } from "@/lib/claude";

export const maxDuration = 120; // Vercel 함수 최대 120초

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

    // 화풍 이미지 처리: File → base64 data URL
    let styleImageUrl: string | null = null;
    if (styleFile && styleFile.size > 0) {
      const buffer = await styleFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      styleImageUrl = `data:${styleFile.type};base64,${base64}`;
    }

    const images = await generateAllImages(prompts, styleImageUrl);
    return NextResponse.json({ images });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[generate]", msg);
    return NextResponse.json(
      { error: `이미지 생성 오류: ${msg}` },
      { status: 500 }
    );
  }
}
