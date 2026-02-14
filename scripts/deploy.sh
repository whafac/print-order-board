#!/bin/sh
# 수정 후 배포 여부를 묻고, 확인 시 커밋·푸시 → Vercel 자동 배포
set -e
cd "$(dirname "$0")/.."

echo "변경 사항:"
git status -s
echo ""

if [ -z "$(git status -s)" ]; then
  echo "커밋할 변경 사항이 없습니다."
  exit 0
fi

printf "배포할까요? (y/n): "
read -r answer
case "$answer" in
  [yY]|[yY][eE][sS])
    ;;
  *)
    echo "취소했습니다."
    exit 0
    ;;
esac

echo ""
printf "커밋 메시지 (비우면 'chore: 배포 업데이트' 사용): "
read -r msg
[ -z "$msg" ] && msg="chore: 배포 업데이트"

git add -A
git commit -m "$msg"
git push origin main

echo ""
echo "푸시 완료. Vercel에서 자동 배포가 진행됩니다."
