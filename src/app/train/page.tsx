"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

type TrainStep = "upload" | "training" | "done" | "error";

interface LogEntry {
  message: string;
}

export default function TrainPage() {
  const [step, setStep] = useState<TrainStep>("upload");
  const [previews, setPreviews] = useState<string[]>([]);
  const [triggerWord, setTriggerWord] = useState("MYSTYLE");
  const [trainSteps, setTrainSteps] = useState(1000);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loraUrl, setLoraUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const filesRef = useRef<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    filesRef.current = [...filesRef.current, ...selected];
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    filesRef.current = filesRef.current.filter((_, i) => i !== index);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // 학습 상태 폴링
  const startPolling = useCallback((reqId: string) => {
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 5;
      setProgress(Math.min(90, Math.floor((elapsed / 600) * 100)));

      try {
        const res = await fetch(`/api/train/status?requestId=${reqId}`);
        const data = await res.json() as {
          status: string;
          loraUrl?: string;
          logs?: LogEntry[];
          error?: string;
        };

        if (data.logs?.length) {
          const msgs = data.logs.map((l) => l.message).filter(Boolean);
          setLogs(msgs.slice(-5));
        }

        setStatusText(data.status);

        if (data.status === "COMPLETED" && data.loraUrl) {
          clearInterval(pollRef.current!);
          setProgress(100);
          setLoraUrl(data.loraUrl);
          localStorage.setItem("dmc_lora_url", data.loraUrl);
          localStorage.setItem("dmc_trigger_word", triggerWord);
          setStep("done");
        } else if (data.status === "FAILED" || data.error) {
          clearInterval(pollRef.current!);
          setError(data.error || "학습 실패");
          setStep("error");
        }
      } catch {
        // 일시적 오류는 무시하고 계속 폴링
      }
    }, 5000);
  }, [triggerWord]);

  const handleStartTraining = async () => {
    if (filesRef.current.length < 5) {
      setError("최소 5장 이상 업로드해주세요.");
      return;
    }
    setError(null);
    setStep("training");
    setLogs([]);
    setProgress(0);

    const formData = new FormData();
    formData.append("triggerWord", triggerWord);
    formData.append("steps", String(trainSteps));
    filesRef.current.forEach((f) => formData.append("images", f));

    try {
      const res = await fetch("/api/train", { method: "POST", body: formData });
      const data = await res.json() as { requestId?: string; error?: string };
      if (!res.ok || !data.requestId) throw new Error(data.error || "학습 요청 실패");
      setRequestId(data.requestId);
      startPolling(data.requestId);
    } catch (e) {
      setError((e as Error).message);
      setStep("error");
    }
  };

  const STATUS_LABELS: Record<string, string> = {
    IN_QUEUE: "대기 중...",
    IN_PROGRESS: "학습 중...",
    COMPLETED: "완료",
    FAILED: "실패",
  };

  return (
    <main className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">화풍 학습</h1>
            <p className="text-amber-700 text-sm">나만의 그림체를 AI에게 학습시키세요</p>
          </div>
          <Link href="/" className="text-sm text-amber-600 hover:text-amber-800 underline">
            ← 만화 만들기로 돌아가기
          </Link>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-4 mb-5 text-sm">
            {error}
          </div>
        )}

        {/* STEP: 업로드 */}
        {step === "upload" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            {/* 이미지 업로드 영역 */}
            <div>
              <label className="block text-sm font-semibold text-amber-900 mb-1">
                학습 이미지 업로드
                <span className="font-normal text-amber-600 ml-2">
                  ({previews.length}장 선택됨 / 최소 5장, 권장 15~30장)
                </span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-300 rounded-xl p-6 text-center cursor-pointer hover:bg-amber-50 transition mb-3"
              >
                <p className="text-amber-500 text-sm">클릭하여 이미지 추가 (여러 장 동시 선택 가능)</p>
                <p className="text-amber-400 text-xs mt-1">JPG, PNG 권장 · 동일한 화풍의 이미지를 업로드하세요</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* 미리보기 그리드 */}
              {previews.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-2 max-h-64 overflow-y-auto">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square group">
                      <img src={src} className="w-full h-full object-cover rounded-lg" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 설정 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-1">
                  트리거 워드
                </label>
                <input
                  type="text"
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value.toUpperCase())}
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="MYSTYLE"
                />
                <p className="text-xs text-amber-500 mt-1">화풍을 호출할 키워드</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-1">
                  학습 스텝
                </label>
                <select
                  value={trainSteps}
                  onChange={(e) => setTrainSteps(Number(e.target.value))}
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value={500}>500 (빠름, ~5분)</option>
                  <option value={1000}>1000 (권장, ~10분)</option>
                  <option value={1500}>1500 (정밀, ~15분)</option>
                </select>
              </div>
            </div>

            {/* 안내 */}
            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 space-y-1">
              <p>💡 <strong>좋은 학습 결과를 위한 팁</strong></p>
              <p>• 동일한 화풍의 이미지를 15~30장 업로드하세요</p>
              <p>• 다양한 구도와 상황의 이미지가 효과적입니다</p>
              <p>• 학습 비용: 약 $0.5~1 (이미지 수/스텝에 따라 다름)</p>
              <p>• 학습 시간: 약 5~15분</p>
            </div>

            <button
              onClick={handleStartTraining}
              disabled={previews.length < 5}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:text-amber-400 text-white font-semibold rounded-xl py-3 transition"
            >
              학습 시작하기 🎓
            </button>
          </div>
        )}

        {/* STEP: 학습 중 */}
        {step === "training" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="font-bold text-amber-900 text-lg text-center">학습 진행 중...</h2>

            {/* 프로그레스 바 */}
            <div>
              <div className="flex justify-between text-xs text-amber-700 mb-1">
                <span>{STATUS_LABELS[statusText] || "진행 중..."}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-3">
                <div
                  className="bg-amber-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* 로그 */}
            {logs.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-3 text-xs font-mono text-green-400 space-y-1 max-h-40 overflow-y-auto">
                {logs.map((log, i) => (
                  <p key={i}>{log}</p>
                ))}
              </div>
            )}

            <div className="text-center text-sm text-amber-600">
              <p>창을 닫아도 학습은 계속됩니다.</p>
              {requestId && (
                <p className="text-xs text-amber-400 mt-1 break-all">Request ID: {requestId}</p>
              )}
            </div>
          </div>
        )}

        {/* STEP: 완료 */}
        {step === "done" && loraUrl && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5 text-center">
            <div className="text-5xl">🎉</div>
            <h2 className="font-bold text-amber-900 text-xl">화풍 학습 완료!</h2>
            <p className="text-amber-700 text-sm">
              트리거 워드 <strong className="text-amber-900">{triggerWord}</strong>로 학습된 화풍이 저장되었습니다.
            </p>

            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs text-amber-600 mb-1">LoRA 모델 URL (자동 저장됨)</p>
              <p className="text-xs text-gray-500 break-all font-mono">{loraUrl}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
              ✅ 이제 만화 만들기 페이지에서 이 화풍이 자동으로 적용됩니다.
            </div>

            <Link
              href="/"
              className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl py-3 transition"
            >
              만화 만들러 가기 →
            </Link>
          </div>
        )}

        {/* STEP: 에러 */}
        {step === "error" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-600 font-semibold">학습 중 오류가 발생했습니다</p>
            <button
              onClick={() => { setStep("upload"); setError(null); }}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-6 py-2 transition"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
