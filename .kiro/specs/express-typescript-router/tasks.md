# 구현 계획: Express + TypeScript 라우터 분리 프록시 서버

## 개요

기존 `clovax/server.js` 단일 파일 프록시 서버를 Express + TypeScript 기반으로 재구성합니다. `/clovax`와 `/upstage` 두 개의 독립 라우터로 분리하고, 공통 프록시 유틸을 통해 HTTPS 프록시 및 SSE 스트리밍을 처리합니다. HTTP/HTTPS 듀얼 모드를 지원하며, Docker 환경에서 실행 가능하도록 Dockerfile과 run.sh를 업데이트합니다.

## Tasks

- [x] 1. 프로젝트 초기화 및 타입 정의
  - [x] 1.1 프로젝트 구조 및 의존성 설정
    - `clovax/package.json` 생성 (express, typescript, @types/express, @types/node, tsx 의존성)
    - `clovax/tsconfig.json` 생성 (strict 모드, outDir: dist, rootDir: src)
    - `clovax/src/` 디렉토리 구조 생성
    - _Requirements: 9.3_

  - [x] 1.2 타입 정의 파일 생성 (types.ts)
    - `clovax/src/types.ts`에 ProxyConfig, TlsConfig, TransformOptions 인터페이스 정의
    - ProxyConfig: hostname, port, basePath 필드
    - TlsConfig: cert, key 필드
    - TransformOptions: forceParallelToolCalls, forceToolChoiceAuto 옵셔널 필드
    - _Requirements: 2.1, 4.1, 9.1, 9.2_

- [ ] 2. 공통 프록시 유틸 구현
  - [x] 2.1 buildTargetPath 함수 구현
    - `clovax/src/utils/proxy.ts`에 buildTargetPath(basePath, requestPath) 함수 구현
    - requestPath에서 `/v1` 접두사를 제거하고 basePath와 결합
    - 예: basePath="/v1/openai", requestPath="/v1/chat/completions" → "/v1/openai/chat/completions"
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 2.2 buildTargetPath 속성 기반 테스트 작성
    - **Property 1: 경로 매핑 정확성**
    - fast-check를 사용하여 임의의 basePath와 `/v1/`로 시작하는 requestPath에 대해 올바른 경로 결합 검증
    - **Validates: Requirements 2.1, 4.1, 5.1**

  - [x] 2.3 transformBody 함수 구현
    - `clovax/src/utils/proxy.ts`에 transformBody(rawBody, options) 함수 구현
    - 유효한 JSON이고 `parallel_tool_calls` 키 존재 시 `forceParallelToolCalls` 옵션에 따라 `true`로 변환
    - 유효한 JSON이고 `tool_choice` 키 존재 시 `forceToolChoiceAuto` 옵션에 따라 `"auto"`로 변환
    - 비JSON body 또는 빈 Buffer는 원본 그대로 반환
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.4 transformBody 속성 기반 테스트 작성 (변환 정확성)
    - **Property 2: body 변환 정확성**
    - fast-check를 사용하여 임의의 JSON body에 대해 parallel_tool_calls → true, tool_choice → "auto" 변환 검증
    - 변환 대상이 아닌 다른 키-값 쌍이 변경되지 않는지 검증
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.5 transformBody 속성 기반 테스트 작성 (멱등성)
    - **Property 3: body 변환 멱등성**
    - fast-check를 사용하여 transformBody(transformBody(input, opts), opts) === transformBody(input, opts) 검증
    - **Validates: Requirement 3.5**

  - [ ]* 2.6 transformBody 속성 기반 테스트 작성 (비JSON 안전성)
    - **Property 4: 비JSON body 안전성**
    - fast-check를 사용하여 유효하지 않은 JSON Buffer에 대해 원본과 바이트 단위 동일 결과 검증
    - **Validates: Requirements 3.3, 3.4**

  - [x] 2.7 proxyRequest 함수 구현
    - `clovax/src/utils/proxy.ts`에 proxyRequest(config, req, res, body) 함수 구현
    - Node.js https 모듈로 대상 서버에 HTTPS 요청 전송
    - host 헤더를 config.hostname으로 교체, content-length를 body 길이로 갱신
    - 대상 서버 응답의 상태 코드와 헤더를 클라이언트에 전달
    - pipe()를 통해 응답 본문을 버퍼링 없이 스트리밍 전달
    - 에러 발생 시 502 Bad Gateway 반환 (헤더 미전송 시), 헤더 전송 완료 시 연결 종료
    - _Requirements: 2.2, 2.3, 6.1, 6.2, 8.1, 8.2_

- [x] 3. 체크포인트 - 프록시 유틸 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

- [x] 4. 라우터 구현
  - [x] 4.1 Clovax 라우터 구현
    - `clovax/src/routes/clovax.ts`에 Express Router 생성
    - 독립적인 ProxyConfig 설정 (hostname: clovastudio.stream.ntruss.com, port: 443, basePath: /v1/openai)
    - 독립적인 TransformOptions 설정 (forceParallelToolCalls: true, forceToolChoiceAuto: true)
    - `/v1/*` 경로에 대해 transformBody 호출 후 proxyRequest로 프록시
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 9.1_

  - [x] 4.2 Upstage 라우터 구현
    - `clovax/src/routes/upstage.ts`에 Express Router 생성
    - 독립적인 ProxyConfig 설정 (hostname: api.upstage.ai, port: 443, basePath: /v1)
    - `/v1/*` 경로에 대해 transformBody 호출 없이 원본 body로 proxyRequest 호출
    - _Requirements: 1.2, 4.1, 4.2, 4.3, 9.2_

  - [ ]* 4.3 Upstage body 무변환 속성 기반 테스트 작성
    - **Property 5: Upstage body 무변환**
    - Upstage 라우터가 transformBody를 호출하지 않고 원본 body를 그대로 전달하는지 검증
    - **Validates: Requirement 4.2**

- [x] 5. Express 앱 진입점 구현
  - [x] 5.1 app.ts 구현
    - `clovax/src/app.ts`에 Express 앱 생성
    - `express.raw({ type: '*/*', limit: '10mb' })` 미들웨어 설정
    - `/clovax` 경로에 Clovax 라우터 마운트
    - `/upstage` 경로에 Upstage 라우터 마운트
    - TLS_CERT, TLS_KEY 환경변수 확인 후 HTTP/HTTPS 서버 분기 시작
    - 둘 다 설정 시 HTTPS, 하나라도 미설정 시 HTTP로 기동
    - 인증서 파일 읽기 실패 시 에러 메시지 출력 후 process.exit(1)
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2, 7.3_

- [x] 6. 체크포인트 - 서버 기동 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

- [x] 7. Docker 및 실행 스크립트 업데이트
  - [x] 7.1 Dockerfile 업데이트
    - `clovax/Dockerfile`을 TypeScript 빌드 지원으로 업데이트
    - package.json 복사 및 npm install 단계 추가
    - TypeScript 소스 복사 및 빌드 (tsc) 단계 추가
    - 빌드된 dist/app.js를 실행하도록 CMD 변경
    - _Requirements: 7.1, 7.2_

  - [x] 7.2 run.sh 업데이트
    - `clovax/run.sh`에 TLS 인증서 마운트 옵션 추가 (선택적)
    - TLS_CERT, TLS_KEY 환경변수 전달 지원
    - _Requirements: 7.1, 7.2_

- [x] 8. 최종 체크포인트 - 전체 통합 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

## Notes

- `*` 표시된 태스크는 선택적이며, 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조합니다
- 체크포인트에서 점진적 검증을 수행합니다
- 속성 기반 테스트는 fast-check 라이브러리를 사용합니다
- 단위 테스트와 속성 기반 테스트는 상호 보완적입니다
