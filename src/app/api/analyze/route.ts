import { NextRequest, NextResponse } from "next/server";
import { analyzeDiary } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { diary } = await req.json();

    if (!diary || typeof diary !== "string" || diary.trim().length < 10) {
      return NextResponse.json(
        { error: "일기를 10자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const result = await analyzeDiary(diary.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error("[analyze]", error);
    return NextResponse.json(
      { error: "서사 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
