# 요구사항 문서

## 소개

기존 `clovax/server.js`에 구현된 단일 파일 Node.js HTTP 프록시 서버를 Express + TypeScript 기반으로 재구성합니다. `/clovax`와 `/upstage` 두 개의 독립적인 라우터로 분리하여, 각 LLM 백엔드별로 독립적인 라우팅, body 변환, 프록시 설정을 관리합니다. HTTP/HTTPS 듀얼 모드를 지원하며, SSE 스트리밍 응답을 그대로 전달합니다.

## 용어집 (Glossary)

- **프록시_서버 (Proxy_Server)**: Express + TypeScript 기반의 HTTP/HTTPS 프록시 서버 애플리케이션
- **Clovax_라우터 (Clovax_Router)**: `/clovax/v1/*` 경로를 처리하여 clovastudio.stream.ntruss.com으로 프록시하는 Express 라우터
- **Upstage_라우터 (Upstage_Router)**: `/upstage/v1/*` 경로를 처리하여 api.upstage.ai로 프록시하는 Express 라우터
- **프록시_유틸 (Proxy_Util)**: proxyRequest, transformBody, buildTargetPath 등 공통 프록시 로직을 제공하는 유틸리티 모듈
- **TransformOptions**: 라우터별 body 변환 옵션을 정의하는 인터페이스 (forceParallelToolCalls, forceToolChoiceAuto)
- **ProxyConfig**: 프록시 대상 서버의 hostname, port, basePath를 정의하는 인터페이스
- **SSE (Server-Sent Events)**: 서버에서 클라이언트로 실시간 스트리밍 데이터를 전달하는 프로토콜

## 요구사항

### 요구사항 1: 라우터 기반 요청 분기

**사용자 스토리:** 개발자로서, 클라이언트 요청을 LLM 백엔드별로 독립적인 라우터로 분기하고 싶습니다. 이를 통해 각 백엔드의 설정과 변환 로직을 독립적으로 관리할 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. WHEN 클라이언트가 `/clovax/v1/*` 경로로 요청을 보내면, THE 프록시_서버 SHALL 해당 요청을 Clovax_라우터로 전달한다
2. WHEN 클라이언트가 `/upstage/v1/*` 경로로 요청을 보내면, THE 프록시_서버 SHALL 해당 요청을 Upstage_라우터로 전달한다
3. WHEN 클라이언트가 등록된 라우터 경로(`/clovax/v1/*`, `/upstage/v1/*`)에 해당하지 않는 경로로 요청을 보내면, THE 프록시_서버 SHALL HTTP 404 상태 코드를 반환한다

### 요구사항 2: Clovax 경로 매핑 및 프록시

**사용자 스토리:** 개발자로서, `/clovax/v1/*` 경로의 요청이 clovastudio.stream.ntruss.com의 올바른 경로로 프록시되기를 원합니다. 이를 통해 ClovaX OpenAI 호환 API를 사용할 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. WHEN Clovax_라우터가 `/v1/*` 하위 경로 요청을 수신하면, THE 프록시_유틸 SHALL 해당 경로를 `clovastudio.stream.ntruss.com`의 `/v1/openai/*` 경로로 매핑하여 HTTPS 요청을 전송한다
2. WHEN Clovax_라우터가 프록시 요청을 전송하면, THE 프록시_유틸 SHALL 클라이언트의 요청 헤더(Authorization 등)를 `host` 헤더만 대상 호스트로 교체하여 그대로 전달한다
3. WHEN Clovax_라우터가 프록시 요청을 전송하면, THE 프록시_유틸 SHALL `content-length` 헤더를 변환된 body의 실제 길이로 갱신한다

### 요구사항 3: Clovax body 변환

**사용자 스토리:** 개발자로서, ClovaX 백엔드에서 특정 파라미터 값을 제대로 처리하지 못하는 이슈를 프록시 단에서 보정하고 싶습니다. 이를 통해 클라이언트가 표준 OpenAI API 형식으로 요청을 보낼 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. WHEN 요청 body가 유효한 JSON이고 `parallel_tool_calls` 키가 존재하면, THE 프록시_유틸 SHALL `forceParallelToolCalls` 옵션이 활성화된 경우 해당 값을 `true`로 변환한다
2. WHEN 요청 body가 유효한 JSON이고 `tool_choice` 키가 존재하면, THE 프록시_유틸 SHALL `forceToolChoiceAuto` 옵션이 활성화된 경우 해당 값을 `"auto"`로 변환한다
3. WHEN 요청 body가 유효한 JSON이 아니면, THE 프록시_유틸 SHALL 원본 body를 변경 없이 그대로 반환한다
4. WHEN 요청 body가 빈 Buffer이면, THE 프록시_유틸 SHALL 원본 body를 그대로 반환한다
5. WHEN transformBody 함수가 동일한 입력에 대해 여러 번 호출되면, THE 프록시_유틸 SHALL 매번 동일한 결과를 반환한다 (멱등성)

### 요구사항 4: Upstage 경로 매핑 및 프록시

**사용자 스토리:** 개발자로서, `/upstage/v1/*` 경로의 요청이 api.upstage.ai의 올바른 경로로 프록시되기를 원합니다. 이를 통해 Upstage API를 사용할 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. WHEN Upstage_라우터가 `/v1/*` 하위 경로 요청을 수신하면, THE 프록시_유틸 SHALL 해당 경로를 `api.upstage.ai`의 `/v1/*` 경로로 매핑하여 HTTPS 요청을 전송한다
2. WHEN Upstage_라우터가 요청을 처리하면, THE Upstage_라우터 SHALL 클라이언트의 요청 body를 변환 없이 원본 그대로 대상 서버에 전달한다
3. WHEN Upstage_라우터가 프록시 요청을 전송하면, THE 프록시_유틸 SHALL 클라이언트의 요청 헤더(Authorization 등)를 `host` 헤더만 대상 호스트로 교체하여 그대로 전달한다

### 요구사항 5: 경로 빌드 함수

**사용자 스토리:** 개발자로서, 클라이언트 요청 경로를 대상 서버의 올바른 경로로 변환하는 공통 함수를 사용하고 싶습니다. 이를 통해 경로 매핑 로직을 일관되게 관리할 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. WHEN buildTargetPath 함수가 basePath와 requestPath를 입력받으면, THE 프록시_유틸 SHALL requestPath에서 `/v1` 접두사를 제거한 나머지를 basePath에 결합하여 반환한다
2. WHEN basePath가 `/v1/openai`이고 requestPath가 `/v1/chat/completions`이면, THE 프록시_유틸 SHALL `/v1/openai/chat/completions`을 반환한다
3. WHEN basePath가 `/v1`이고 requestPath가 `/v1/chat/completions`이면, THE 프록시_유틸 SHALL `/v1/chat/completions`을 반환한다

### 요구사항 6: SSE 스트리밍 응답 전달

**사용자 스토리:** 개발자로서, LLM 백엔드의 SSE 스트리밍 응답이 클라이언트에 실시간으로 전달되기를 원합니다. 이를 통해 채팅 응답을 점진적으로 수신할 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. WHEN 대상 서버가 응답을 반환하면, THE 프록시_유틸 SHALL 대상 서버의 응답 상태 코드와 헤더를 클라이언트에 그대로 전달한다
2. WHEN 대상 서버가 스트리밍 응답을 반환하면, THE 프록시_유틸 SHALL pipe()를 통해 응답 본문을 버퍼링 없이 클라이언트에 실시간 전달한다

### 요구사항 7: HTTP/HTTPS 듀얼 모드

**사용자 스토리:** 운영자로서, TLS 인증서 설정 여부에 따라 HTTP 또는 HTTPS 모드로 서버를 기동하고 싶습니다. 이를 통해 환경에 맞는 보안 수준을 적용할 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. WHILE 환경변수 `TLS_CERT`와 `TLS_KEY`가 모두 설정되고 해당 파일이 존재하면, THE 프록시_서버 SHALL HTTPS 서버로 기동한다
2. WHILE 환경변수 `TLS_CERT`와 `TLS_KEY` 중 하나라도 미설정이면, THE 프록시_서버 SHALL HTTP 서버로 기동한다
3. IF 환경변수 `TLS_CERT`와 `TLS_KEY`가 설정되었으나 해당 파일을 읽을 수 없으면, THEN THE 프록시_서버 SHALL 에러 메시지를 출력하고 프로세스를 종료한다 (exit code 1)

### 요구사항 8: 에러 처리

**사용자 스토리:** 개발자로서, 프록시 요청 중 발생하는 에러가 적절히 처리되기를 원합니다. 이를 통해 클라이언트가 명확한 에러 응답을 받을 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. IF 프록시 대상 서버에 연결할 수 없으면, THEN THE 프록시_유틸 SHALL HTTP 502 상태 코드와 "Bad Gateway" 메시지를 클라이언트에 반환한다
2. IF 프록시 요청 중 에러가 발생하고 응답 헤더가 이미 전송된 상태이면, THEN THE 프록시_유틸 SHALL 추가 헤더 전송 없이 연결을 종료한다

### 요구사항 9: 라우터 독립성

**사용자 스토리:** 개발자로서, 각 라우터의 설정과 변환 로직이 서로 독립적이기를 원합니다. 이를 통해 한 라우터의 변경이 다른 라우터에 영향을 주지 않고, 향후 새로운 LLM 백엔드를 쉽게 추가할 수 있습니다.

#### 수용 기준 (Acceptance Criteria)

1. THE Clovax_라우터 SHALL 독립적인 ProxyConfig와 TransformOptions를 가지며, Upstage_라우터의 설정에 영향을 받지 않는다
2. THE Upstage_라우터 SHALL 독립적인 ProxyConfig를 가지며, Clovax_라우터의 설정에 영향을 받지 않는다
3. WHEN 새로운 LLM 백엔드 라우터를 추가할 때, THE 프록시_서버 SHALL 기존 라우터의 코드 변경 없이 새 라우터를 Express 앱에 마운트할 수 있는 구조를 제공한다
