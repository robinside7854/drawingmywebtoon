import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId");
  if (!requestId) {
    return NextResponse.json({ error: "requestId가 필요합니다." }, { status: 400 });
  }

  const statusRes = await fetch(
    `https://queue.fal.run/fal-ai/flux-lora-fast-training/requests/${requestId}/status`,
    { headers: { "Authorization": `Key ${process.env.FAL_KEY}` } }
  );

  if (!statusRes.ok) {
    return NextResponse.json({ error: `상태 조회 실패: ${statusRes.status}` }, { status: 500 });
  }

  const statusData = await statusRes.json() as {
    status: string;
    logs?: { message: string }[];
  };

  // 완료 시 결과(LoRA URL) 가져오기
  if (statusData.status === "COMPLETED") {
    const resultRes = await fetch(
      `https://queue.fal.run/fal-ai/flux-lora-fast-training/requests/${requestId}`,
      { headers: { "Authorization": `Key ${process.env.FAL_KEY}` } }
    );
    const result = await resultRes.json() as {
      diffusers_lora_file?: { url: string };
      config_file?: { url: string };
    };
    return NextResponse.json({
      status: "COMPLETED",
      loraUrl: result.diffusers_lora_file?.url,
      logs: statusData.logs,
    });
  }

  return NextResponse.json({
    status: statusData.status,
    logs: statusData.logs,
  });
}
