# ClovaX Proxy - Express + TypeScript 기반 LLM 프록시 서버

Naver HyperClovaX와 Upstage Solar-Pro3의 OpenAI 호환 API를 UiPath BYOCM으로 사용할 때 발생하는 호환성 이슈를 보정하는 프록시 서버입니다.

## 경로 매핑

### HyperClovaX

ClovaX의 OpenAI 호환 API는 `/v1/openai` 하위에 위치하므로 경로를 변환합니다.

```text
/clovax/v1/chat/completions → clovastudio.stream.ntruss.com/v1/openai/chat/completions
/clovax/v1/models           → clovastudio.stream.ntruss.com/v1/openai/models
/clovax/v1/embeddings       → clovastudio.stream.ntruss.com/v1/openai/embeddings
```

### Upstage Solar-Pro3

Upstage는 표준 `/v1` 경로를 사용하므로 경로 변환 없이 그대로 전달합니다.

```text
/upstage/v1/chat/completions → api.upstage.ai/v1/chat/completions
/upstage/v1/models           → api.upstage.ai/v1/models
/upstage/v1/embeddings       → api.upstage.ai/v1/embeddings
```

## 요청 Body 변환

`/v1/chat/completions` 요청에 대해서만 벤더별 변환 규칙을 적용합니다. `/v1/models`와 `/v1/embeddings`는 변환 없이 그대로 전달합니다.

### HyperClovaX

| 파라미터 | 변환 | 사유 |
| --- | --- | --- |
| `parallel_tool_calls` | `true`로 강제 설정 | `false` 처리 시 오류 발생 |
| `tool_choice` | `"auto"`로 강제 설정 | 특정 `tool_choice` 값 미지원 |

### Upstage Solar-Pro3

| 파라미터 | 변환 | 사유 |
| --- | --- | --- |
| `parallel_tool_calls` | 키 제거 | 해당 파라미터 미지원 |
| `tool_choice` | `"required"`로 강제 설정 | 특정 `tool_choice` 값 미지원 |

## 구성

```text
src/
├── app.ts              # Express 앱 진입점 (HTTP/HTTPS 듀얼 모드)
├── types.ts            # 공통 타입 정의
├── routes/
│   ├── clovax.ts       # HyperClovaX 라우터
│   └── upstage.ts      # Upstage 라우터
└── utils/
    ├── proxy.ts        # 공통 프록시 및 body 변환 유틸
    ├── proxy.test.ts   # 프록시 유틸 테스트
    └── logger.ts       # 로그 레벨 유틸
```

## 실행

```bash
# Docker 이미지 빌드 및 push
./build-docker-image.sh

# 로컬 개발
npm run dev

# 프로덕션
npm run build && npm start
```

## 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `8080` | 서버 포트 |
| `LOG_LEVEL` | `info` | 로그 레벨 (`debug`, `info`, `warn`, `error`) |
| `TLS_CERT` | - | HTTPS 인증서 파일 경로 |
| `TLS_KEY` | - | HTTPS 키 파일 경로 |
