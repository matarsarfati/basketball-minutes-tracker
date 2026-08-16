#!/bin/bash
URL="https://firestore.googleapis.com/v1/projects/basketball-eda67/databases/(default)/documents/teams/F4mC1BMjehHhvKTTXGfv/schedules"
COUNT=0
PAGE_TOKEN=""

while true; do
  if [ -z "$PAGE_TOKEN" ]; then
    RES=$(curl -s "$URL")
  else
    RES=$(curl -s "${URL}?pageToken=${PAGE_TOKEN}")
  fi

  BATCH_COUNT=$(echo "$RES" | grep -o '"name":' | wc -l)
  COUNT=$((COUNT + BATCH_COUNT))
  
  PAGE_TOKEN=$(echo "$RES" | grep '"nextPageToken":' | awk -F'"' '{print $4}')
  
  if [ -z "$PAGE_TOKEN" ]; then
    break
  fi
done

echo "TOTAL EVENTS: $COUNT"
