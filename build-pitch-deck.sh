#!/usr/bin/env bash

set -euo pipefail

INPUT="${1:-PITCH_DECK.md}"
OUTPUT_BASENAME="${2:-creator-inbox-pitch-deck}"
OUTPUT_BASENAME="${OUTPUT_BASENAME%.pptx}"
OUTPUT="$HOME/Desktop/${OUTPUT_BASENAME}.pptx"

mkdir -p "$(dirname "$OUTPUT")"

pnpm dlx @marp-team/marp-cli "$INPUT" --pptx --allow-local-files -o "$OUTPUT"

printf "Created deck: %s\n" "$OUTPUT"
