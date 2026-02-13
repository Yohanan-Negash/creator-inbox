#!/usr/bin/env bash

set -euo pipefail

INPUT="${1:-PITCH_DECK.md}"
OUTPUT="${2:-dist/creator-inbox-pitch-deck.pptx}"

mkdir -p "$(dirname "$OUTPUT")"

pnpm dlx @marp-team/marp-cli "$INPUT" --pptx --allow-local-files -o "$OUTPUT"

printf "Created deck: %s\n" "$OUTPUT"
