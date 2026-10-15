"""Tolly Index cross-check: MovieLens 32M ratings (GroupLens, research licence) for our films.

Too thin to be an input (207 of our films, 61 with 10+ ratings), so compute.mts only reports how
well it agrees with IMDb. Download ml-32m.zip from https://files.grouplens.org/datasets/movielens/
into .cache/tolly/movielens/ and unzip it there first.

Output: .cache/tolly/movielens-ours.json  {tconst: {votes, mean (out of 10)}}
Usage: python3 scripts/tolly/movielens.py
"""
import collections
import csv
import json

linked = json.load(open(".cache/tolly/films-linked.json"))
want = {f["tconst"] for f in linked if f["tconst"]}
movie_to_tconst = {}
for row in csv.DictReader(open(".cache/tolly/movielens/ml-32m/links.csv")):
    tconst = "tt" + row["imdbId"]
    if tconst in want:
        movie_to_tconst[row["movieId"]] = tconst

totals = collections.defaultdict(lambda: [0, 0.0])
with open(".cache/tolly/movielens/ml-32m/ratings.csv") as fh:
    next(fh)
    for line in fh:
        parts = line.split(",")
        if parts[1] in movie_to_tconst:
            t = totals[parts[1]]
            t[0] += 1
            t[1] += float(parts[2])

out = {movie_to_tconst[m]: {"votes": n, "mean": round(s / n * 2, 3)} for m, (n, s) in totals.items()}
json.dump(out, open(".cache/tolly/movielens-ours.json", "w"))
print(f"{len(movie_to_tconst)} films on MovieLens, {len(out)} rated, {sum(1 for v in out.values() if v['votes'] >= 10)} with 10+ ratings")
