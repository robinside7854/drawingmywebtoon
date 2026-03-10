"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { AnalyzeResult } from "@/lib/claude";

type Step = "input" | "analyzing" | "scenes" | "generating" | "result";

interface GeneratedImage {
  index: number;
  url: string;
}

export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [diary, setDiary] = useState("");
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loraUrl, setLoraUrl] = useState<string | null>(null);
  const [triggerWord, setTriggerWord] = useState<string | null>(null);

  const styleFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 저장된 LoRA 불러오기
  useEffect(() => {
    setLoraUrl(localStorage.getItem("dmc_lora_url"));
    setTriggerWord(localStorage.getItem("dmc_trigger_word"));
  }, []);

  // 화풍 이미지 선택
  const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    styleFileRef.current = file;
    const url = URL.createObjectURL(file);
    setStylePreview(url);
  };

  // Step 1: 서사 분절
  const handleAnalyze = async () => {
    if (diary.trim().length < 10) {
      setError("일기를 10자 이상 입력해주세요.");
      return;
    }
    setError(null);
    setStep("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalyzeResult(data);
      setStep("scenes");
    } catch (e) {
      setError((e as Error).message || "분석 중 오류가 발생했습니다.");
      setStep("input");
    }
  };

  // Step 2: 이미지 생성
  const handleGenerate = async () => {
    if (!analyzeResult) return;
    setError(null);
    setStep("generating");

    try {
      const formData = new FormData();
      formData.append("scenes", JSON.stringify(analyzeResult.scenes));
      if (styleFileRef.current) {
        formData.append("styleImage", styleFileRef.current);
      }
      if (loraUrl) formData.append("loraUrl", loraUrl);
      if (triggerWord) formData.append("triggerWord", triggerWord);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const sorted = [...data.images].sort((a: GeneratedImage, b: GeneratedImage) => a.index - b.index);
      setImages(sorted);
      setStep("result");
    } catch (e) {
      setError((e as Error).message || "이미지 생성 중 오류가 발생했습니다.");
      setStep("scenes");
    }
  };

  // 2×2 합성 후 PNG 다운로드
  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || images.length < 4) return;

    const SIZE = 512;
    const TOTAL = SIZE * 2;
    canvas.width = TOTAL;
    canvas.height = TOTAL;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const positions = [
      { x: 0, y: 0 },
      { x: SIZE, y: 0 },
      { x: 0, y: SIZE },
      { x: SIZE, y: SIZE },
    ];

    await Promise.all(
      images.map(async (img, i) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          el.onload = () => resolve();
          el.onerror = reject;
          el.src = img.url;
        });
        const { x, y } = positions[i];
        ctx.drawImage(el, x, y, SIZE, SIZE);
      })
    );

    const link = document.createElement("a");
    link.download = `drawing-my-cartoon-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [images]);

  const reset = () => {
    setStep("input");
    setDiary("");
    setStylePreview(null);
    setAnalyzeResult(null);
    setImages([]);
    setError(null);
    styleFileRef.current = null;
  };

  const LABELS: Record<string, string> = { "기": "起", "승": "承", "전": "轉", "결": "結" };

  return (
    <main className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-900 mb-1">드로잉마이카툰</h1>
          <p className="text-amber-700 text-sm">당신의 하루가 한 편의 예술이 되는 곳 ✏️</p>
        </div>

        {/* LoRA 상태 + 학습 링크 */}
        <div className="flex items-center justify-between mb-6">
          {loraUrl ? (
            <div className="flex items-center gap-2 bg-green-100 border border-green-300 rounded-xl px-3 py-2 text-xs text-green-700">
              <span>✅ 학습된 화풍 적용 중</span>
              <strong className="text-green-900">{triggerWord}</strong>
              <button
                onClick={() => {
                  localStorage.removeItem("dmc_lora_url");
                  localStorage.removeItem("dmc_trigger_word");
                  setLoraUrl(null);
                  setTriggerWord(null);
                }}
                className="text-green-500 hover:text-red-500 ml-1"
              >✕</button>
            </div>
          ) : (
            <div className="text-xs text-amber-500">화풍 미적용 (기본 스타일)</div>
          )}
          <Link
            href="/train"
            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded-xl px-3 py-2 transition"
          >
            🎓 화풍 학습하기
          </Link>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* STEP: 입력 */}
        {(step === "input" || step === "analyzing") && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-2">
                오늘의 일기 ✍️
              </label>
              <textarea
                value={diary}
                onChange={(e) => setDiary(e.target.value)}
                placeholder="오늘 있었던 일을 자유롭게 적어주세요. AI가 기-승-전-결 4컷으로 변환해드립니다."
                rows={6}
                className="w-full border border-amber-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-2">
                화풍 이미지 <span className="font-normal text-amber-600">(선택 — 업로드하면 해당 화풍으로 생성)</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-300 rounded-xl p-4 text-center cursor-pointer hover:bg-amber-50 transition"
              >
                {stylePreview ? (
                  <img src={stylePreview} alt="화풍 미리보기" className="h-24 mx-auto object-contain rounded-lg" />
                ) : (
                  <p className="text-amber-500 text-sm">클릭하여 이미지 선택</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleStyleChange}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={step === "analyzing"}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-xl py-3 transition"
            >
              {step === "analyzing" ? "분석 중..." : "4컷 스토리 만들기"}
            </button>
          </div>
        )}

        {/* STEP: 씬 미리보기 */}
        {(step === "scenes" || step === "generating") && analyzeResult && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-amber-900 text-lg">스토리 분석 결과</h2>
            <p className="text-xs text-amber-600">캐릭터: {analyzeResult.characterSeed}</p>

            <div className="grid grid-cols-2 gap-3">
              {analyzeResult.scenes.map((scene) => (
                <div key={scene.index} className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {LABELS[scene.label] ?? scene.label}
                    </span>
                    <span className="text-xs font-semibold text-amber-800">{scene.summary}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{scene.prompt}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                disabled={step === "generating"}
                className="flex-1 border border-amber-300 text-amber-700 font-semibold rounded-xl py-3 hover:bg-amber-50 transition disabled:opacity-50"
              >
                다시 작성
              </button>
              <button
                onClick={handleGenerate}
                disabled={step === "generating"}
                className="flex-2 flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-xl py-3 transition"
              >
                {step === "generating" ? "그리는 중... (~30초)" : "4컷 만화 그리기 🎨"}
              </button>
            </div>
          </div>
        )}

        {/* STEP: 결과 */}
        {step === "result" && images.length === 4 && analyzeResult && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-amber-900 text-lg text-center">완성된 네컷 만화 🎉</h2>

            {/* 2×2 그리드 */}
            <div className="grid grid-cols-2 gap-2 aspect-square">
              {images.map((img, i) => (
                <div key={img.index} className="relative aspect-square overflow-hidden rounded-xl bg-amber-100">
                  <img
                    src={img.url}
                    alt={analyzeResult.scenes[i]?.summary ?? `컷 ${img.index}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {LABELS[analyzeResult.scenes[i]?.label] ?? img.index}
                  </div>
                </div>
              ))}
            </div>

            {/* 숨겨진 합성용 Canvas */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 border border-amber-300 text-amber-700 font-semibold rounded-xl py-3 hover:bg-amber-50 transition"
              >
                새로 만들기
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl py-3 transition"
              >
                PNG 다운로드 ⬇️
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
