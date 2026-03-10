# DrawingMyCartoon — Plan Document

> **Status**: DRAFT — 사용자 검토 및 승인 대기 중
> **작성일**: 2026-03-10
> **MVP 범위**: 핵심 기능 (텍스트 → 4컷 생성 → 다운로드)
> **Phase**: Beta (인증·아카이빙 미포함)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | 드로잉마이카툰 (DrawingMyCartoon) |
| 비전 | 당신의 하루가 한 편의 예술이 되는 곳 |
| 출력 규격 | 1:1 정사각형, 4분할 네컷 레이아웃 |
| 타겟 | SNS 퍼스널 브랜딩 크리에이터 |
| 경로 | c:/Users/N_399/Desktop/ai_rob/drawing-my-cartoon/ |

---

## 2. 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| Frontend | Next.js 14 (App Router) + TypeScript | 기존 프로젝트 패턴 통일 |
| Styling | Tailwind CSS | 빠른 1:1 레이아웃 구성 |
| 서사 분절 | Claude API (claude-sonnet-4-6) | 기-승-전-결 4씬 분할 + 프롬프트 생성 |
| 이미지 생성 | **Fal.ai** | IP-Adapter + ControlNet 지원, 크레딧 과금 |
| 배포 | Vercel | 서버리스, 무료 티어 시작 |
| 환경변수 | .env.local | 서버사이드 전용 (클라이언트 노출 금지) |

> **Supabase (인증·DB·스토리지)**: MVP에서는 제외. 2단계(Scaling)에 도입.

---

## 3. MVP 기능 범위

### ✅ 포함 (Beta)
1. **텍스트 입력**: 자유 형식 일기/텍스트 입력 UI
2. **서사 분절**: Claude API로 기-승-전-결 4씬 + 이미지 프롬프트 자동 생성
3. **화풍 이미지 업로드**: 사용자 소스 이미지 업로드 (IP-Adapter 컨디셔닝용)
4. **4컷 이미지 생성**: Fal.ai `fal-ai/ip-adapter-face-id` 또는 `fal-ai/controlnet` 모델
5. **네컷 레이아웃 합성**: Canvas API로 2×2 정사각형 합성
6. **다운로드**: PNG 단일 파일 다운로드

### ❌ 제외 (2단계 이후)
- 사용자 인증 (Supabase Auth)
- 챕터/시리즈 아카이빙
- 피드백 수집 및 lessons_learned.md 루프
- Selective Regeneration (특정 컷만 재생성)
- 커뮤니티·화풍 마켓

---

## 4. 시스템 아키텍처

```
[사용자 브라우저]
       │
       ▼
[Next.js App Router — Vercel Edge]
       │
   ┌───┴────────────────────┐
   │                        │
   ▼                        ▼
POST /api/analyze        POST /api/generate
(Claude API)             (Fal.ai API)
   │                        │
   │  4씬 분절 + 프롬프트    │  4장 이미지 URL 반환
   └───────────┬────────────┘
               │
               ▼
       [Canvas 합성 — 클라이언트]
               │
               ▼
       [PNG 다운로드]
```

---

## 5. 파일·폴더 구조

```
drawing-my-cartoon/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 메인 UI (입력 + 결과)
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── analyze/route.ts      # POST: 텍스트 → 4씬 + 프롬프트 (Claude)
│   │       └── generate/route.ts     # POST: 프롬프트 + 화풍 → 이미지 4장 (Fal.ai)
│   ├── components/
│   │   ├── TextInput.tsx             # 일기 입력 영역
│   │   ├── StyleUpload.tsx           # 화풍 소스 이미지 업로드
│   │   ├── ScenePreview.tsx          # 4씬 텍스트 미리보기
│   │   ├── ComicCanvas.tsx           # 2×2 네컷 합성 Canvas
│   │   └── DownloadButton.tsx        # PNG 다운로드
│   └── lib/
│       ├── claude.ts                 # Claude API 서사 분절 로직
│       ├── fal.ts                    # Fal.ai 이미지 생성 로직
│       └── canvas.ts                 # 2×2 합성 유틸
├── docs/
│   ├── plan.md                       # 이 파일
│   └── lessons_learned.md            # 오류·개선 기록 (수동 관리)
├── public/
├── .env.local                        # API 키 (git 제외)
├── .gitignore
├── next.config.ts
├── package.json
└── tailwind.config.ts
```

---

## 6. API 명세

### POST /api/analyze
```
Request:
  { "diary": "오늘 아침 늦게 일어났다. 지각할 뻔 했는데..." }

Response:
  {
    "scenes": [
      { "index": 1, "label": "기", "summary": "아침 늦잠", "prompt": "A person waking up late, surprised face, bright morning light, cartoon style" },
      { "index": 2, "label": "승", "summary": "허겁지겁 준비", "prompt": "Person rushing to get ready, messy room, cartoon style" },
      { "index": 3, "label": "전", "summary": "지각 직전 달리기", "prompt": "Person running fast on street, clock showing 8:59, cartoon style" },
      { "index": 4, "label": "결", "summary": "아슬아슬 도착", "prompt": "Person arriving at office door, relieved expression, cartoon style" }
    ],
    "characterSeed": "young adult, casual clothes, short hair"
  }
```

### POST /api/generate
```
Request (multipart/form-data):
  - scenes: JSON string (4씬 배열)
  - styleImage: File (화풍 소스 이미지)
  - characterSeed: string

Response:
  {
    "images": [
      { "index": 1, "url": "https://fal.ai/..." },
      { "index": 2, "url": "https://fal.ai/..." },
      { "index": 3, "url": "https://fal.ai/..." },
      { "index": 4, "url": "https://fal.ai/..." }
    ]
  }
```

---

## 7. Fal.ai 모델 선택

IP-Adapter + 화풍 일관성을 위한 후보 모델:

| 모델 | 특징 | 권장 사용 |
|------|------|-----------|
| `fal-ai/flux/dev` | 고품질 기본 생성 | 화풍 이미지 없을 때 폴백 |
| `fal-ai/ip-adapter-face-id-plus` | 얼굴 일관성 특화 | 캐릭터 고정 |
| `fal-ai/controlnet-union` | 구도·선화 컨디셔닝 | 화풍 선·구도 모방 |
| **`fal-ai/flux/dev` + IP-Adapter** | 화풍 + 내용 균형 | **MVP 기본 선택** |

> 초기 구현: `fal-ai/flux/dev`로 시작 → IP-Adapter 추가 → 결과 품질 검토 후 ControlNet 추가.

---

## 8. 예상 비용 (생성 1회 기준)

| 항목 | 단가 | 4컷 생성 1회 |
|------|------|-------------|
| Claude API (analyze) | ~$0.003 / 1K tokens | ≈ $0.01 |
| Fal.ai (이미지 4장, FLUX dev) | ~$0.025 / 이미지 | ≈ $0.10 |
| **합계** | | **≈ $0.11 / 회** |

> 월 100회 생성 기준 ≈ $11. Vercel 무료 티어 + 서버리스 → 서버 비용 $0.

---

## 9. 구현 순서 (Phase별)

### Phase 1 — 뼈대 (1일)
- [ ] Next.js 프로젝트 초기화
- [ ] 환경변수 설정 (.env.local)
- [ ] 기본 UI 레이아웃 (입력창 + 업로드 + 결과 영역)

### Phase 2 — 서사 분절 (1일)
- [ ] `/api/analyze` 구현 (Claude API)
- [ ] 4씬 미리보기 UI

### Phase 3 — 이미지 생성 (2일)
- [ ] Fal.ai SDK 연동 (`@fal-ai/serverless-client`)
- [ ] `/api/generate` 구현
- [ ] IP-Adapter 화풍 이미지 컨디셔닝

### Phase 4 — 합성·출력 (1일)
- [ ] Canvas 2×2 합성 로직
- [ ] PNG 다운로드

### Phase 5 — 검증 (1일)
- [ ] 1:1 비율 시각 검증 (Playwright)
- [ ] 에러 핸들링 및 로딩 상태
- [ ] lessons_learned.md 초기 기록

---

## 10. 환경변수 목록

```bash
ANTHROPIC_API_KEY=         # Claude API
FAL_KEY=                   # Fal.ai API Key
```

---

## 11. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| 화풍 일관성 부족 | ControlNet 추가, 프롬프트 보강 |
| 이미지 생성 속도 (~30초/장) | 4장 병렬 요청, 진행 상태 UI |
| 클라이언트 이미지 업로드 용량 | 서버사이드 resize (sharp) 적용 |
| Fal.ai 일시 장애 | Replicate 폴백 추상화 레이어 준비 |

---

## ✏️ 사용자 검토 사항

> 아래 항목을 확인하고 승인해주시면 구현을 시작합니다.

- [ ] 기술 스택 동의 (Next.js + Fal.ai + Claude)
- [ ] MVP 범위 동의 (인증·아카이빙 제외)
- [ ] API 명세 구조 동의
- [ ] 예상 비용 수준 동의 ($0.11/회)
- [ ] Phase별 순서 동의

> **승인 방법**: 이 파일에 인라인 메모를 남기거나, 채팅으로 "승인" 또는 수정 사항을 알려주세요.
