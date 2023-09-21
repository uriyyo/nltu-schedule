#! /usr/bin/env sh
set -e

exec uvicorn        \
    --host 0.0.0.0  \
    --port 80       \
    --access-log    \
    --loop="uvloop" \
     "app:app"
