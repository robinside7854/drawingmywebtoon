import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const formData = await req.formData();
    const triggerWord = (formData.get("triggerWord") as string) || "MYSTYLE";
    const steps = parseInt((formData.get("steps") as string) || "1000");
    const files = formData.getAll("images") as File[];

    if (files.length < 5) {
      return NextResponse.json({ error: "최소 5장 이상의 이미지를 업로드해주세요." }, { status: 400 });
    }

    // 이미지들을 zip으로 압축
    const zip = new JSZip();
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      zip.file(file.name, buffer);
    }
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Fal.ai 스토리지에 zip 업로드
    const uploadForm = new FormData();
    uploadForm.append("file", new Blob([zipBuffer], { type: "application/zip" }), "training_images.zip");

    const uploadRes = await fetch("https://storage.fal.run/upload", {
      method: "POST",
      headers: { "Authorization": `Key ${process.env.FAL_KEY}` },
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`스토리지 업로드 실패: ${uploadRes.status} — ${err.slice(0, 200)}`);
    }

    const { url: imagesDataUrl } = await uploadRes.json() as { url: string };

    // LoRA 학습 큐 제출
    const trainRes = await fetch("https://queue.fal.run/fal-ai/flux-lora-fast-training", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        images_data_url: imagesDataUrl,
        trigger_word: triggerWord,
        steps,
        rank: 16,
        learning_rate: 0.0004,
        create_masks: true,
      }),
    });

    if (!trainRes.ok) {
      const err = await trainRes.text();
      throw new Error(`학습 요청 실패: ${trainRes.status} — ${err.slice(0, 200)}`);
    }

    const trainData = await trainRes.json() as { request_id: string };
    return NextResponse.json({ requestId: trainData.request_id, triggerWord });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[train]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
