#!/bin/bash

#
# Sync from Upstream Repository
#
# Pulls files from upstream repo and overlays them into current repo.
# Files in overrides/ directories are treated specially:
#   - Never overwritten if they already exist (preserves downstream customizations)
#   - Seeded from upstream if missing (ensures code compiles after new features are added)
#   - Use --reset-overrides to force-copy all upstream overrides (discard customizations)
#
# Usage:
#   ./sync-from-upstream.sh                              # Sync from matching upstream branch
#   ./sync-from-upstream.sh --commit                     # Sync + commit + push
#   ./sync-from-upstream.sh --branch feature-x           # Override upstream branch
#   ./sync-from-upstream.sh --reset-overrides            # Force-reset all overrides/ files to upstream defaults
#   ./sync-from-upstream.sh abc123f                      # Sync to specific commit
#   ./sync-from-upstream.sh abc123f --commit             # Sync to specific commit + commit + push
#
# By default, syncs from the upstream branch matching your current local branch.
#

set -e

# =============================================================================
# CONFIGURATION - Edit these values
# =============================================================================

UPSTREAM="https://github.com/acho1833/ride.git"

EXCLUDE=(
  ".git/"
  ".claude/"
  "CLAUDE.md"
  "tasks/"
  ".next/"
  "sync-from-upstream.sh"
  "package-lock.json"
  "yarn.lock"
  "pnpm-lock.yaml"
  "bun.lock"
)

# =============================================================================
# Script - No need to edit below
# =============================================================================

# Parse arguments
COMMIT_REF="HEAD"
DO_COMMIT=false
RESET_OVERRIDES=false
UPSTREAM_BRANCH=$(git rev-parse --abbrev-ref HEAD)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --commit)
      DO_COMMIT=true
      shift
      ;;
    --branch)
      UPSTREAM_BRANCH="$2"
      shift 2
      ;;
    --reset-overrides)
      RESET_OVERRIDES=true
      shift
      ;;
    *)
      COMMIT_REF="$1"
      shift
      ;;
  esac
done

TEMP_DIR="/tmp/upstream-sync-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check for required tools
check_dependencies() {
  for cmd in git rsync; do
    if ! command -v "$cmd" &> /dev/null; then
      log_error "$cmd is required but not installed."
      exit 1
    fi
  done
}

# Build rsync exclude arguments
build_exclude_args() {
  local args=""
  for pattern in "${EXCLUDE[@]}"; do
    args="$args --exclude=$pattern"
  done
  echo "$args"
}

# Cleanup function
cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    log_info "Cleaning up temp directory..."
    rm -rf "$TEMP_DIR"
  fi
}

trap cleanup EXIT

# Main
main() {
  check_dependencies

  log_info "Cloning upstream: $UPSTREAM (branch: $UPSTREAM_BRANCH)"
  git clone --quiet --branch "$UPSTREAM_BRANCH" "$UPSTREAM" "$TEMP_DIR"

  cd "$TEMP_DIR"

  if [ "$COMMIT_REF" != "HEAD" ]; then
    log_info "Checking out: $COMMIT_REF"
    git checkout --quiet "$COMMIT_REF"
  fi

  COMMIT_SHA=$(git rev-parse --short HEAD)
  COMMIT_MSG=$(git log -1 --format="%B")
  COMMIT_SUBJECT=$(git log -1 --format="%s")

  log_info "Syncing from commit: $COMMIT_SHA - $COMMIT_SUBJECT"

  cd - > /dev/null

  EXCLUDE_ARGS=$(build_exclude_args)

  log_info "Copying files..."
  # Pass 1: sync all files, skipping overrides/ directories entirely
  eval rsync -av --quiet $EXCLUDE_ARGS --exclude="**/overrides/" "$TEMP_DIR/" "./"

  # Pass 2: seed overrides/ files — copy only if missing (or force with --reset-overrides)
  log_info "Seeding overrides..."
  SEEDED_OVERRIDES=()
  while IFS= read -r src_file; do
    rel_path="${src_file#$TEMP_DIR/}"
    dest_file="./$rel_path"
    if [ ! -f "$dest_file" ] || [ "$RESET_OVERRIDES" = true ]; then
      mkdir -p "$(dirname "$dest_file")"
      cp "$src_file" "$dest_file"
      SEEDED_OVERRIDES+=("$rel_path")
    fi
  done < <(find "$TEMP_DIR" -path "*/overrides/*" -type f)

  # Check for changes (modified, added, untracked)
  MODIFIED=$(git diff --name-only 2>/dev/null)
  UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)

  if [ -z "$MODIFIED" ] && [ -z "$UNTRACKED" ] && [ ${#SEEDED_OVERRIDES[@]} -eq 0 ]; then
    log_warn "No changes to sync."
  else
    echo ""
    echo "========================================"
    echo "Changes synced:"
    echo "----------------------------------------"

    # Show modified files
    if [ -n "$MODIFIED" ]; then
      echo -e "${YELLOW}Modified:${NC}"
      echo "$MODIFIED" | while read -r file; do
        echo "  M  $file"
      done
    fi

    # Show added files
    if [ -n "$UNTRACKED" ]; then
      echo -e "${GREEN}Added:${NC}"
      echo "$UNTRACKED" | while read -r file; do
        echo "  A  $file"
      done
    fi

    # Show seeded overrides
    if [ ${#SEEDED_OVERRIDES[@]} -gt 0 ]; then
      echo -e "${GREEN}Seeded overrides:${NC}"
      for file in "${SEEDED_OVERRIDES[@]}"; do
        echo "  O  $file"
      done
    fi

    echo "----------------------------------------"
    echo ""
    echo "Upstream commit message:"
    echo "----------------------------------------"
    echo "$COMMIT_MSG"
    echo "----------------------------------------"

    if [ "$DO_COMMIT" = true ]; then
      # Commit and push
      echo ""
      log_info "Committing changes..."
      git add .
      git commit -m "commit"

      CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
      log_info "Pushing to origin $CURRENT_BRANCH..."
      git push origin "$CURRENT_BRANCH"

      echo ""
      log_info "Done! Changes committed and pushed."
      echo "----------------------------------------"
      echo "Summary:"
      if [ -n "$MODIFIED" ]; then
        MOD_COUNT=$(echo "$MODIFIED" | wc -l | tr -d ' ')
        echo "  Modified: $MOD_COUNT file(s)"
      fi
      if [ -n "$UNTRACKED" ]; then
        ADD_COUNT=$(echo "$UNTRACKED" | wc -l | tr -d ' ')
        echo "  Added:    $ADD_COUNT file(s)"
      fi
      echo "  Commit:   $COMMIT_SHA"
    else
      echo ""
      echo "To commit and push, run:"
      echo "  ./sync-from-upstream.sh --commit"
    fi
    echo "========================================"
  fi
}

main
