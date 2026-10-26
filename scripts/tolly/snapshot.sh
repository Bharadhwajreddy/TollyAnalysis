#!/usr/bin/env bash
# Tolly Index — download once, compute offline.
#
#   snapshot: packs every downloaded input the index needs (Wikipedia pages, Wikidata, IMDb extracts,
#             page views, TMDB) into one dated archive. IMDb's full dataset files are left out: the
#             extracts for our films are inside, and the full files can be re-downloaded any time.
#   restore:  unpacks an archive into .cache/, after which `npm run tolly:compute` needs no internet.
#
# The archive holds IMDb and TMDB numbers, which are licensed for personal, non-commercial use:
# keep it private (your own drive), never in the repository. TMDB data may be cached for 6 months.
#
# Usage: npm run tolly:snapshot            → tolly-snapshot-YYYY-MM-DD.tar.gz in the current folder
#        npm run tolly:restore -- <archive>
set -euo pipefail
cmd="${1:-}"
case "$cmd" in
  snapshot)
    out="tolly-snapshot-$(date -u +%Y-%m-%d).tar.gz"
    files=$(cd . && ls .cache/import/*.json .cache/tolly/*.json .cache/tolly/*.csv 2>/dev/null)
    tar -czf "$out" $files
    echo "wrote $out ($(du -h "$out" | cut -f1), $(echo "$files" | wc -l) files)"
    ;;
  restore)
    archive="${2:?usage: snapshot.sh restore <archive>}"
    tar -xzf "$archive"
    echo "restored $(tar -tzf "$archive" | wc -l) files into .cache/ — now run: npm run tolly:compute -- <asOf>"
    ;;
  *)
    echo "usage: snapshot.sh snapshot | restore <archive>" >&2
    exit 1
    ;;
esac
