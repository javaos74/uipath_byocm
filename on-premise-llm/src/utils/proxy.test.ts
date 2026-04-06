import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTargetPath, transformBody, proxyRequest } from './proxy';
import https from 'https';
import { EventEmitter } from 'stream';
import type { ProxyConfig } from '../types';

describe('buildTargetPath', () => {
  it('basePath="/v1/openai", requestPath="/v1/chat/completions" → "/v1/openai/chat/completions"', () => {
    expect(buildTargetPath('/v1/openai', '/v1/chat/completions')).toBe('/v1/openai/chat/completions');
  });

  it('basePath="/v1", requestPath="/v1/chat/completions" → "/v1/chat/completions"', () => {
    expect(buildTargetPath('/v1', '/v1/chat/completions')).toBe('/v1/chat/completions');
  });

  it('basePath="/v1/openai", requestPath="/v1/models" → "/v1/openai/models"', () => {
    expect(buildTargetPath('/v1/openai', '/v1/models')).toBe('/v1/openai/models');
  });

  it('basePath="/api", requestPath="/v1/embeddings" → "/api/embeddings"', () => {
    expect(buildTargetPath('/api', '/v1/embeddings')).toBe('/api/embeddings');
  });
});

describe('transformBody', () => {
  it('action: set - 지정된 키가 존재하면 해당 값으로 변환한다', () => {
    const body = Buffer.from(JSON.stringify({ parallel_tool_calls: false, model: 'gpt-4' }));
    const result = transformBody(body, {
      overrides: [{ action: 'set', key: 'parallel_tool_calls', value: true }],
    });
    const parsed = JSON.parse(result.toString());
    expect(parsed.parallel_tool_calls).toBe(true);
    expect(parsed.model).toBe('gpt-4');
  });

  it('action: remove - 지정된 키가 존재하면 삭제한다', () => {
    const body = Buffer.from(JSON.stringify({ parallel_tool_calls: false, model: 'gpt-4' }));
    const result = transformBody(body, {
      overrides: [{ action: 'remove', key: 'parallel_tool_calls' }],
    });
    const parsed = JSON.parse(result.toString());
    expect(parsed).toEqual({ model: 'gpt-4' });
  });

  it('여러 overrides를 동시에 적용한다 (set + remove)', () => {
    const body = Buffer.from(JSON.stringify({ tool_choice: 'none', parallel_tool_calls: false, model: 'gpt-4' }));
    const result = transformBody(body, {
      overrides: [
        { action: 'remove', key: 'parallel_tool_calls' },
        { action: 'set', key: 'tool_choice', value: 'auto' },
      ],
    });
    const parsed = JSON.parse(result.toString());
    expect(parsed.parallel_tool_calls).toBeUndefined();
    expect(parsed.tool_choice).toBe('auto');
    expect(parsed.model).toBe('gpt-4');
  });

  it('overrides에 지정된 키가 body에 없으면 아무 동작도 하지 않는다', () => {
    const body = Buffer.from(JSON.stringify({ model: 'gpt-4' }));
    const result = transformBody(body, {
      overrides: [{ action: 'set', key: 'parallel_tool_calls', value: true }],
    });
    const parsed = JSON.parse(result.toString());
    expect(parsed).toEqual({ model: 'gpt-4' });
  });

  it('비JSON body는 원본 그대로 반환한다', () => {
    const body = Buffer.from('this is not json');
    const result = transformBody(body, { overrides: [{ action: 'set', key: 'x', value: 1 }] });
    expect(result).toEqual(body);
  });

  it('빈 Buffer는 원본 그대로 반환한다', () => {
    const body = Buffer.alloc(0);
    const result = transformBody(body, { overrides: [{ action: 'set', key: 'x', value: 1 }] });
    expect(result.length).toBe(0);
  });

  it('overrides가 빈 배열이면 JSON은 변경되지 않는다', () => {
    const original = { model: 'gpt-4', temperature: 0.7 };
    const body = Buffer.from(JSON.stringify(original));
    const result = transformBody(body, { overrides: [] });
    const parsed = JSON.parse(result.toString());
    expect(parsed).toEqual(original);
  });
});

describe('proxyRequest', () => {
  const config: ProxyConfig = {
    hostname: 'example.com',
    port: 443,
    basePath: '/v1/openai',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('대상 서버로 올바른 옵션으로 HTTPS 요청을 전송한다', () => {
    // 모의 proxyReq (ClientRequest)
    const mockProxyReq = new EventEmitter() as any;
    mockProxyReq.end = vi.fn();

    vi.spyOn(https, 'request').mockImplementation((_opts: any, _cb: any) => {
      return mockProxyReq;
    });

    const req = {
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { authorization: 'Bearer token', host: 'localhost:8080' },
    } as any;

    const res = {
      writeHead: vi.fn(),
      headersSent: false,
      end: vi.fn(),
    } as any;

    const body = Buffer.from('{"model":"gpt-4"}');

    proxyRequest(config, req, res, body);

    // https.request가 올바른 옵션으로 호출되었는지 확인
    expect(https.request).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'example.com',
        port: 443,
        path: '/v1/openai/chat/completions',
        method: 'POST',
        headers: expect.objectContaining({
          host: 'example.com',
          'content-length': String(body.length),
          authorization: 'Bearer token',
        }),
      }),
      expect.any(Function)
    );

    // body가 전송되었는지 확인
    expect(mockProxyReq.end).toHaveBeenCalledWith(body);
  });

  it('대상 서버 응답의 상태 코드와 헤더를 클라이언트에 전달하고 pipe로 스트리밍한다', () => {
    const mockProxyReq = new EventEmitter() as any;
    mockProxyReq.end = vi.fn();

    let requestCallback: Function;
    vi.spyOn(https, 'request').mockImplementation((_opts: any, cb: any) => {
      requestCallback = cb;
      return mockProxyReq;
    });

    const res = {
      writeHead: vi.fn(),
      headersSent: false,
      end: vi.fn(),
    } as any;

    const req = {
      path: '/v1/models',
      method: 'GET',
      headers: { host: 'localhost' },
    } as any;

    proxyRequest(config, req, res, Buffer.alloc(0));

    // 대상 서버 응답 시뮬레이션
    requestCallback!({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      pipe: vi.fn(),
    });

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'content-type': 'application/json' });
  });

  it('에러 발생 시 헤더 미전송이면 502 Bad Gateway를 반환한다', () => {
    const mockProxyReq = new EventEmitter() as any;
    mockProxyReq.end = vi.fn();

    vi.spyOn(https, 'request').mockImplementation((_opts: any, _cb: any) => {
      return mockProxyReq;
    });

    // console.error 억제
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = {
      writeHead: vi.fn(),
      headersSent: false,
      end: vi.fn(),
    } as any;

    const req = {
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { host: 'localhost' },
    } as any;

    proxyRequest(config, req, res, Buffer.alloc(0));

    // 에러 이벤트 발생
    mockProxyReq.emit('error', new Error('ECONNREFUSED'));

    expect(res.writeHead).toHaveBeenCalledWith(502);
    expect(res.end).toHaveBeenCalledWith('Bad Gateway');
  });

  it('에러 발생 시 헤더 이미 전송되었으면 writeHead 없이 연결을 종료한다', () => {
    const mockProxyReq = new EventEmitter() as any;
    mockProxyReq.end = vi.fn();

    vi.spyOn(https, 'request').mockImplementation((_opts: any, _cb: any) => {
      return mockProxyReq;
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = {
      writeHead: vi.fn(),
      headersSent: true, // 헤더 이미 전송됨
      end: vi.fn(),
    } as any;

    const req = {
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { host: 'localhost' },
    } as any;

    proxyRequest(config, req, res, Buffer.alloc(0));

    mockProxyReq.emit('error', new Error('socket hang up'));

    // writeHead가 호출되지 않아야 함 (headersSent가 true이므로)
    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledWith('Bad Gateway');
  });
});
