# GitHub 연동 및 배포 가이드

## 1. GitHub에 코드 올리기

### 1) GitHub에서 저장소 생성

- [GitHub](https://github.com/new) 에서 새 저장소 생성 (이름 예: `print-order-board`)
- **Initialize with README** 체크 해제 (이미 로컬에 코드가 있음)

### 2) 로컬에서 remote 추가 후 push

```bash
cd /Users/hoon/projects/print-order-board

# 변경/추가된 파일 모두 스테이징
git add -A
git status   # .env.local 등은 .gitignore에 있어 제외됨

# 커밋
git commit -m "feat: 제작 의뢰 관리 앱 (PIN 인증, 시트 연동, 목록/상세/새 의뢰/매체 사양)"

# GitHub 저장소를 remote로 추가 (본인 저장소 URL로 변경)
git remote add origin https://github.com/YOUR_USERNAME/print-order-board.git

# main 브랜치 푸시
git push -u origin main
```

---

## 2. Vercel에 배포하기

Next.js는 [Vercel](https://vercel.com) 에서 배포하는 것이 가장 간단합니다.

### 1) Vercel 가입 및 GitHub 연동

- [vercel.com](https://vercel.com) 접속 → **Sign Up** → **Continue with GitHub**
- GitHub 권한 허용

### 2) 새 프로젝트 Import

- **Add New** → **Project**
- **Import Git Repository** 에서 `print-order-board` 선택
- **Import** 클릭

### 3) 환경 변수 설정

**Settings** → **Environment Variables** 에서 아래 변수 추가 (로컬 `.env.local`과 동일한 값 사용):

| Name | Value | 비고 |
|------|--------|------|
| `TEAM_PIN_HASH_B64` | (base64 PIN 해시) | 로컬과 동일 |
| `AUTH_TOKEN_SECRET` | (랜덤 문자열) | 로컬과 동일 |
| `GOOGLE_SHEET_ID` | 스프레드시트 ID | 로컬과 동일 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 서비스 계정 이메일 | 로컬과 동일 |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | 프라이빗 키 전체 (따옴표 포함) | `\n` 그대로 또는 실제 줄바꿈 |

- **Save** 후 **Redeploy** 한 번 실행

### 4) 배포 완료

- 배포가 끝나면 `https://print-order-board-xxx.vercel.app` 형태의 URL이 부여됨
- 해당 URL로 접속해 PIN 로그인 후 동작 확인

---

## 3. 배포 후 작업 이어가기

### 수정 후 배포 (확인 시 자동 업데이트)

코드 수정이 끝나면 아래 명령을 실행하세요. **배포할까요?** 라고 물어보고, `y` 입력 시 커밋·푸시 후 Vercel이 자동 배포합니다.

```bash
cd /Users/hoon/projects/print-order-board
npm run deploy
```

(또는 `./scripts/deploy.sh` — 처음 한 번은 `chmod +x scripts/deploy.sh` 로 실행 권한 부여)

- 변경 파일 목록이 보이고, `배포할까요? (y/n):` 에 **y** 입력 → 커밋 메시지 입력(비우면 "chore: 배포 업데이트") → 푸시 → Vercel 자동 배포
- **n** 입력 시 취소

### 일상적인 흐름

1. **최신 코드 받기** (다른 PC에서 작업했거나 팀원이 push 한 경우)
   ```bash
   git pull origin main
   ```

2. **로컬에서 수정 후 테스트**
   ```bash
   npm run dev
   # http://localhost:3000 에서 확인
   ```

3. **배포하기**
   ```bash
   ./scripts/deploy.sh
   ```
   → "배포할까요? (y/n):" 에 **y** 입력하면 푸시 후 Vercel 자동 배포

4. **Vercel**  
   - push 시 자동 배포  
   - Vercel 대시보드 → **Deployments** 에서 진행 상황 확인

### 404 등 문제가 있을 때

- **Vercel** → 프로젝트 → **Logs** (또는 **Functions** → 해당 함수 로그)  
  - `[getJobById] Job not found. jobId=... rows=...` 같은 로그로 시트 행 수·컬럼 위치 확인 가능
- Google 시트 **jobs_raw** 탭:
  - 1행: 헤더 권장 (`job_id`, `created_at`, `requester_name`, …) — 띄어쓰기/대소문자는 코드에서 보정함
  - 2행부터: 의뢰 데이터
- 시트에 서비스 계정 이메일이 **편집자**로 공유되어 있는지 확인

---

## 4. 요약

| 단계 | 작업 |
|------|------|
| 1 | GitHub에 새 저장소 생성 → `git remote add origin` → `git push` |
| 2 | Vercel 가입 → GitHub 연동 → 프로젝트 Import → 환경 변수 설정 → Redeploy |
| 3 | 이후 수정: 로컬에서 `git add` → `commit` → `push` 하면 Vercel이 자동 배포 |

.env.local 은 절대 GitHub에 올리지 않습니다. `.gitignore`에 `.env*`가 있어 기본적으로 제외됩니다.
