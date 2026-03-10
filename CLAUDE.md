# DrawingMyCartoon — CLAUDE.md

## 프로젝트
텍스트 일기 → 기-승-전-결 4컷 만화 자동 생성 플랫폼 (Beta, 내부 테스트용)

## 스택
- Next.js 14 App Router + TypeScript + Tailwind CSS
- Claude API: 서사 분절 + 프롬프트 생성 (`/api/analyze`)
- Fal.ai: 이미지 생성 IP-Adapter (`/api/generate`)
- Vercel: 배포

## 핵심 파일
- `src/app/page.tsx` — 메인 UI
- `src/app/api/analyze/route.ts` — 텍스트 → 4씬 분절
- `src/app/api/generate/route.ts` — Fal.ai 이미지 생성
- `src/lib/claude.ts` — Claude API 로직
- `src/lib/fal.ts` — Fal.ai 로직

## 규칙
- API 키는 서버사이드 전용 (.env.local), 클라이언트 노출 금지
- 모든 이미지 출력: 1:1 정사각형, 2×2 네컷 레이아웃
- MVP: 인증·DB 없음, 최대한 단순하게
