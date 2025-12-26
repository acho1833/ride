#!/bin/bash

#
# Sync from Upstream Repository
#
# Pulls files from upstream repo and overlays them into current repo.
#
# Usage:
#   ./sync-from-upstream.sh                    # Sync to latest (review only)
#   ./sync-from-upstream.sh --commit           # Sync to latest + commit + push
#   ./sync-from-upstream.sh abc123f            # Sync to specific commit
#   ./sync-from-upstream.sh abc123f --commit   # Sync to specific commit + commit + push
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
  "sync-from-upstream.sh",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml"
  "bun.lock"
)

# =============================================================================
# Script - No need to edit below
# =============================================================================

# Parse arguments
COMMIT_REF="HEAD"
DO_COMMIT=false

for arg in "$@"; do
  if [ "$arg" == "--commit" ]; then
    DO_COMMIT=true
  else
    COMMIT_REF="$arg"
  fi
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

  log_info "Cloning upstream: $UPSTREAM"
  git clone --quiet "$UPSTREAM" "$TEMP_DIR"

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
  eval rsync -av --quiet $EXCLUDE_ARGS "$TEMP_DIR/" "./"

  # Check for changes (modified, added, untracked)
  MODIFIED=$(git diff --name-only 2>/dev/null)
  UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)

  if [ -z "$MODIFIED" ] && [ -z "$UNTRACKED" ]; then
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
      git commit -m "$COMMIT_MSG"

      log_info "Pushing to origin main..."
      git push origin main

      log_info "Done! Changes committed and pushed."
    else
      echo ""
      echo "To commit and push, run:"
      echo "  ./sync-from-upstream.sh --commit"
    fi
    echo "========================================"
  fi
}

main
