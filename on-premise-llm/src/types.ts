// 프록시 대상 설정
export interface ProxyConfig {
  hostname: string;   // 프록시 대상 호스트
  port: number;       // 대상 포트 (기본 443)
  basePath: string;   // 대상 기본 경로
}

// TLS 설정 (HTTPS 서버 기동용)
export interface TlsConfig {
  cert: string;   // TLS 인증서 파일 경로
  key: string;    // TLS 개인키 파일 경로
}

// JSON body 필드 변환 규칙
// action: 'set'은 값 덮어쓰기, 'remove'는 키 삭제
export type FieldOverride =
  | { action: 'set'; key: string; value: unknown }
  | { action: 'remove'; key: string };

// body 변환 옵션 (라우터별로 독립적으로 설정)
// overrides 배열로 어떤 키를 어떤 값으로 바꿀지 자유롭게 지정
export interface TransformOptions {
  overrides: FieldOverride[];
}

// 라우터별 커스텀 body 변환 함수 타입
// 각 LLM 백엔드마다 독립적인 변환 로직을 정의할 수 있습니다
export type BodyTransformer = (rawBody: Buffer) => Buffer;
