import express from 'express';
import crypto from 'crypto';
import path from 'path';

const app = express();
const PORT = 3100;

// CORS 설정
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// 정적 파일 서빙
app.use(express.static(path.join(__dirname)));

// 메모리에 저장할 데이터 (실제 서비스에서는 DB나 파일 시스템)
let dataStore = {
  content: 'Initial content',
  version: 1,
  lastModified: new Date().toUTCString()
};

// ETag 생성 함수
function generateETag(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

// 1. no-store 테스트 - 항상 새로운 데이터
app.get('/api/no-store', (req, res) => {
  const timestamp = new Date().toISOString();
  const data = {
    message: 'no-store 테스트',
    timestamp,
    random: Math.random().toString(36).substring(7),
    explanation: 'Cache-Control: no-store로 인해 브라우저는 이 응답을 캐시하지 않습니다. 매번 새로운 데이터가 반환됩니다.'
  };

  res.set({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json'
  });

  console.log(`[no-store] ${timestamp} - 새 데이터 전송`);
  res.json(data);
});

// 2. ETag 테스트 - 조건부 요청
app.get('/api/etag', (req, res) => {
  const etag = generateETag(`${dataStore.content}-${dataStore.version}`);
  const clientETag = req.headers['if-none-match'];

  console.log(`[ETag] 서버 ETag: ${etag}, 클라이언트 ETag: ${clientETag}`);

  // ETag가 일치하면 304 반환
  if (clientETag === etag) {
    console.log('[ETag] 304 Not Modified 반환');
    res.status(304).end();
    return;
  }

  const data = {
    message: 'ETag 테스트',
    content: dataStore.content,
    version: dataStore.version,
    etag,
    explanation: 'ETag 기반 조건부 요청입니다. 데이터가 변경되지 않으면 304 응답을 받습니다.'
  };

  res.set({
    'Cache-Control': 'no-cache',
    'ETag': etag,
    'Content-Type': 'application/json'
  });

  console.log('[ETag] 200 OK - 새 데이터 전송');
  res.json(data);
});

// 3. Last-Modified 테스트
app.get('/api/last-modified', (req, res) => {
  const clientLastModified = req.headers['if-modified-since'];
  
  console.log(`[Last-Modified] 서버: ${dataStore.lastModified}, 클라이언트: ${clientLastModified}`);

  // Last-Modified가 일치하면 304 반환
  if (clientLastModified === dataStore.lastModified) {
    console.log('[Last-Modified] 304 Not Modified 반환');
    res.status(304).end();
    return;
  }

  const data = {
    message: 'Last-Modified 테스트',
    content: dataStore.content,
    version: dataStore.version,
    lastModified: dataStore.lastModified,
    explanation: 'Last-Modified 기반 조건부 요청입니다. 수정 시간이 같으면 304 응답을 받습니다.'
  };

  res.set({
    'Cache-Control': 'no-cache',
    'Last-Modified': dataStore.lastModified,
    'Content-Type': 'application/json'
  });

  console.log('[Last-Modified] 200 OK - 새 데이터 전송');
  res.json(data);
});

// 4. max-age 테스트
app.get('/api/max-age', (req, res) => {
  const data = {
    message: 'max-age 테스트',
    timestamp: new Date().toISOString(),
    explanation: '30초 동안 브라우저 캐시에서 직접 사용됩니다. 네트워크 요청 없이 즉시 응답됩니다.'
  };

  res.set({
    'Cache-Control': 'max-age=30',
    'Content-Type': 'application/json'
  });

  console.log('[max-age] 새 데이터 전송 (30초 캐시)');
  res.json(data);
});

// 데이터 업데이트 엔드포인트
app.post('/api/update', express.json(), (req, res) => {
  const newContent = req.body.content || `Updated at ${new Date().toISOString()}`;
  
  dataStore.content = newContent;
  dataStore.version += 1;
  dataStore.lastModified = new Date().toUTCString();

  console.log(`[UPDATE] 데이터 업데이트: version ${dataStore.version}`);
  
  res.json({
    success: true,
    newData: dataStore
  });
});

// 현재 데이터 상태 확인
app.get('/api/status', (req, res) => {
  res.json(dataStore);
});

app.listen(PORT, () => {
  console.log(`🚀 캐시 테스트 서버 실행: http://localhost:${PORT}`);
  console.log('테스트 엔드포인트:');
  console.log('- GET /api/no-store');
  console.log('- GET /api/etag');
  console.log('- GET /api/last-modified');
  console.log('- GET /api/max-age');
  console.log('- POST /api/update');
}); 