# QA WebApp Frontend

React 기반 웹 애플리케이션

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (로컬만)
npm start

# 네트워크 접근 가능하도록 실행 (다른 컴퓨터에서도 접근 가능)
npm run start:network
```

애플리케이션이 http://localhost:3000 에서 실행됩니다.
네트워크 모드로 실행하면 같은 네트워크의 다른 컴퓨터에서 `http://YOUR_IP:3000`으로 접근 가능합니다.

## 네트워크 접근 설정

### 1. 프론트엔드
```bash
# 네트워크 모드로 실행
npm run start:network
```

### 2. 백엔드 API URL 설정
`.env` 파일을 생성하고 (프로젝트 루트에):
```env
REACT_APP_API_BASE_URL=http://YOUR_IP:8080/api
```

예: `REACT_APP_API_BASE_URL=http://192.168.0.100:8080/api`

### 3. 백엔드 서버 설정
백엔드도 네트워크 접근이 가능하도록 설정:
- Spring Boot: `server.address=0.0.0.0` 설정
- 포트 8080 방화벽 열기

### 4. 방화벽 설정 (Windows)
```powershell
# 관리자 권한으로 실행
netsh advfirewall firewall add rule name="React App" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=8080
```

## 실시간 동기화

**현재는 실시간 동기화(WebSocket)가 필요하지 않습니다.**

현재 기능들은 모두 REST API로 충분합니다:
- 파일 업로드/조회: 서버에 저장되므로 새로고침하면 다른 사용자도 볼 수 있음
- 피드백 저장: 서버에 저장되므로 새로고침하면 반영됨

**주의**: 셀 병합 기능은 현재 로컬에서만 작동하며 서버에 저장되지 않습니다.

## 빌드

```bash
npm run build
```

