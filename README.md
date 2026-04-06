# UiPath BYOCM - OpenAI v1 호환 LLM 프록시

UiPath에서 OpenAI v1 호환 LLM을 BYOCM(Bring Your Own Custom Model) 옵션으로 추가할 때 발생하는 호환성 이슈를 해결하기 위한 프록시 서버입니다.

현재 Naver HyperClovaX와 Upstage Solar-Pro3 LLM을 지원합니다.

## 배경

UiPath BYOCM은 등록 시 `/v1/models`, `/v1/chat/completions`, `/v1/embeddings` 엔드포인트에 대한 호환성 체크를 수행합니다. 일부 LLM 벤더의 OpenAI 호환 API는 이 체크 과정에서 전달되는 특정 파라미터(`parallel_tool_calls`, `tool_choice` 등)를 제대로 처리하지 못해 등록에 실패합니다.

이 프록시는 클라이언트와 LLM 벤더 API 사이에서 문제가 되는 요청 파라미터를 벤더별로 보정하여 UiPath BYOCM 호환성 체크를 통과할 수 있도록 합니다.

## 지원 모델

| 경로 | LLM | 백엔드 | 설명 |
| --- | --- | --- | --- |
| `/clovax/v1/*` | Naver HyperClovaX | `clovastudio.stream.ntruss.com/v1/openai` | 경로 변환 + 파라미터 보정 |
| `/upstage/v1/*` | Upstage Solar-Pro3 | `api.upstage.ai/v1` | 파라미터 보정 |

## 엔드포인트

각 벤더별로 다음 3개의 OpenAI v1 호환 엔드포인트를 제공합니다.

| 엔드포인트 | 설명 | Body 변환 |
| --- | --- | --- |
| `/{vendor}/v1/models` | 모델 목록 조회 | 없음 |
| `/{vendor}/v1/embeddings` | 임베딩 | 없음 |
| `/{vendor}/v1/chat/completions` | 채팅 완성 | 벤더별 규칙 적용 |

## 벤더별 Body 변환 규칙

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

소스 코드는 `on-premise-llm/` 디렉토리에 있습니다. 자세한 내용은 [on-premise-llm/README.md](on-premise-llm/README.md)를 참고하세요.

## 실행

```bash
# on-premise-llm 디렉토리에서
cd on-premise-llm

# Docker 이미지 빌드 및 Docker Hub push
./build-docker-image.sh

# 로컬 실행 (개발)
npm run dev

# 프로덕션 실행
npm run build
npm start
```

로그 레벨은 환경변수 `LOG_LEVEL`로 제어합니다 (기본값: `info`, request body 확인: `debug`).

## UiPath 설정

UiPath BYOCM 설정 시 엔드포인트를 프록시 주소로 지정합니다.

- HyperClovaX: `http://{proxy-host}:8080/clovax`
- Upstage Solar-Pro3: `http://{proxy-host}:8080/upstage`

Authorization 헤더에 각 벤더의 API 키를 설정하면 프록시가 그대로 전달합니다.
