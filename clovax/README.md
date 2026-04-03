# ClovaX Proxy - Naver HyperClovaX 호환 프록시

Naver HyperClovaX의 OpenAI 호환 API(`clovastudio.stream.ntruss.com/v1/openai`)를 UiPath BYOCM으로 사용할 때 발생하는 요청 파라미터 이슈를 보정하는 프록시 서버입니다.

## 경로 매핑

클라이언트의 OpenAI v1 표준 경로를 ClovaX 엔드포인트로 변환합니다.

```
/v1/chat/completions → clovastudio.stream.ntruss.com/v1/openai/chat/completions
/v1/models           → clovastudio.stream.ntruss.com/v1/openai/models
```

## 요청 Body 변환

ClovaX에서 특정 파라미터 값을 제대로 처리하지 못하는 이슈가 있어, 프록시에서 다음 값을 강제 변환합니다.

| 파라미터 | 변환 전 | 변환 후 | 사유 |
|---|---|---|---|
| `parallel_tool_calls` | `false` | `true` | ClovaX에서 `false` 처리 시 오류 발생 |
| `tool_choice` | 임의 값 | `"auto"` | ClovaX에서 특정 `tool_choice` 값 미지원 |

## 실행

```bash
./run.sh
```

Docker로 빌드 및 실행되며, `http://localhost:8080`에서 서비스됩니다.

## 구성

- `server.js` - Node.js 프록시 서버 (SSE 스트리밍 지원)
- `Dockerfile` - non-root 사용자로 실행되는 컨테이너 이미지
- `run.sh` - Docker 빌드 및 실행 스크립트

## UiPath 설정

UiPath BYOCM 설정 시 엔드포인트를 프록시 주소로 지정하고, Authorization 헤더에 ClovaX API 키를 설정하면 됩니다. 프록시가 헤더를 그대로 전달합니다.
