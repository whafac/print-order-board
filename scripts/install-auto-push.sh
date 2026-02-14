#!/bin/sh
# 커밋 후 자동 푸시 훅 설치 (한 번만 실행)
cd "$(dirname "$0")/.."
HOOK_SRC=scripts/git-hooks/post-commit
HOOK_DST=.git/hooks/post-commit
cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"
echo "설치 완료: git commit 후 자동으로 git push origin main 이 실행됩니다."
