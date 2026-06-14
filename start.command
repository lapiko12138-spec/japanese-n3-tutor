#!/bin/bash
# 启动日语学习网站(本地只读后台)。双击本文件即可,或在终端运行 ./start.command
cd "$(dirname "$0")" || exit 1
PORT=8000
URL="http://localhost:${PORT}/web/"

echo "============================================"
echo "  日本語学習 · 学习管理后台"
echo "  启动本地服务器: ${URL}"
echo "  关闭窗口或按 Ctrl+C 即可停止"
echo "============================================"

# 若端口被占用,自动尝试 8001..8010
if lsof -i :${PORT} >/dev/null 2>&1; then
  for p in 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010; do
    if ! lsof -i :${p} >/dev/null 2>&1; then PORT=$p; URL="http://localhost:${p}/web/"; break; fi
  done
  echo "端口 8000 被占用,改用 ${URL}"
fi

python3 -m http.server ${PORT} >/dev/null 2>&1 &
SERVER_PID=$!
sleep 1
open "${URL}"
echo "已在浏览器打开:${URL}"
echo "服务器 PID: ${SERVER_PID}"
trap "echo; echo '正在停止服务器…'; kill ${SERVER_PID} 2>/dev/null; exit 0" INT TERM
wait ${SERVER_PID}
