# UiPath BYOCM - OpenAI v1 호환 LLM 프록시

UiPath에서 OpenAI v1 호환 LLM을 BYOCM(Bring Your Own Custom Model) 옵션으로 추가할 때 발생하는 호환성 이슈를 해결하기 위한 프록시 서버 모음입니다.

각 LLM 벤더별로 OpenAI v1 API 포맷(`/v1/chat/completions`, `/v1/models`)을 그대로 사용하면서, 벤더 고유의 호환성 문제를 프록시 레벨에서 처리합니다.

## 지원 모델

| 디렉토리 | LLM | 설명 |
|---|---|---|
| `clovax/` | Naver HyperClovaX | ClovaX OpenAI 호환 API의 요청 파라미터 이슈 보정 |

## 사용 방법

각 디렉토리의 README를 참고하세요.
