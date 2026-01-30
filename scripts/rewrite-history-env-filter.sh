#!/bin/sh
# Used by git filter-branch to set author/committer to owizdom and dates to yesterday morning.
COUNT_FILE=/tmp/moltbot-rewrite-count
[ -f "$COUNT_FILE" ] || echo 0 > "$COUNT_FILE"
count=$(cat "$COUNT_FILE")

# Yesterday 08:00 local time; add (count) minutes so commits stay ordered
YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null) || YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null)
BASE_EPOCH=$(date -j -f "%Y-%m-%d %H:%M:%S" "${YESTERDAY} 08:00:00" +%s 2>/dev/null) || true
[ -z "$BASE_EPOCH" ] && BASE_EPOCH=$(date -d "${YESTERDAY} 08:00:00" +%s 2>/dev/null)
NEW_EPOCH=$((BASE_EPOCH + count * 60))
GIT_AUTHOR_DATE=$(date -r "$NEW_EPOCH" "+%Y-%m-%d %H:%M:%S %z" 2>/dev/null) || GIT_AUTHOR_DATE=$(date -d "@$NEW_EPOCH" "+%Y-%m-%d %H:%M:%S %z" 2>/dev/null)
export GIT_AUTHOR_DATE
export GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"

export GIT_AUTHOR_NAME="owizdom"
export GIT_AUTHOR_EMAIL="gokun4621@gmail.com"
export GIT_COMMITTER_NAME="owizdom"
export GIT_COMMITTER_EMAIL="gokun4621@gmail.com"

echo $((count + 1)) > "$COUNT_FILE"
