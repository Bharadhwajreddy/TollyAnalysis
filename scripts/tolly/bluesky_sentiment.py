"""Tolly Index — scores the Bluesky posts collected by bluesky.mts (experimental Voice signal).

Per film: posts kept, English posts, VADER sentiment (positive share minus negative share among
English posts with a clear tone), the lower bound of the 95% interval for the positive share, and
the average of any Letterboxd star ratings people shared ("My ★★★★ review of …"). Then checks how
well this agrees with the IMDb rating before anyone relies on it.

Needs: pip install vaderSentiment; .cache/tolly/bluesky.json; .cache/tolly/films-linked.json
Output: .cache/tolly/bluesky-voice.json (per film) and a printed summary
Usage: python3 scripts/tolly/bluesky_sentiment.py
"""
import json
import math
import re

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

posts = json.load(open(".cache/tolly/bluesky.json"))
linked = {l["key"]: l for l in json.load(open(".cache/tolly/films-linked.json"))}
films = {f["key"]: f for f in json.load(open("lib/data/tolly/films.json"))["films"]}
vader = SentimentIntensityAnalyzer()
STARS = re.compile(r"(★{1,5})(½)?")


def wilson_lower(pos, n, z=1.96):
    if n == 0:
        return None
    p = pos / n
    return (p + z * z / (2 * n) - z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / (1 + z * z / n)


out = {}
for key, v in posts.items():
    english = [p for p in v["posts"] if not p["langs"] or "en" in p["langs"]]
    scores = [vader.polarity_scores(p["text"])["compound"] for p in english]
    pos = sum(1 for s in scores if s >= 0.05)
    neg = sum(1 for s in scores if s <= -0.05)
    stars = []
    for p in v["posts"]:
        if "review of" in p["text"].lower() or "letterboxd" in p["text"].lower() or "boxd.it" in p["text"]:
            m = STARS.search(p["text"])
            if m:
                stars.append(len(m.group(1)) + (0.5 if m.group(2) else 0))
    out[key] = {
        "posts": len(v["posts"]),
        "english": len(english),
        "positive": pos,
        "negative": neg,
        "net": round((pos - neg) / (pos + neg), 3) if pos + neg else None,
        "positiveLower": round(wilson_lower(pos, pos + neg), 3) if pos + neg else None,
        "letterboxdStars": round(sum(stars) / len(stars), 2) if stars else None,
        "letterboxdN": len(stars),
    }
json.dump(out, open(".cache/tolly/bluesky-voice.json", "w"))


def corr(xs, ys):
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    return round(sxy / math.sqrt(sxx * syy), 2) if sxx and syy else None


total = len(out)
with_any = sum(1 for o in out.values() if o["posts"])
with10 = [k for k, o in out.items() if o["positive"] + o["negative"] >= 10]
pairs = [(out[k]["net"], linked[k]["imdbRating"]) for k in with10 if k in linked and linked[k]["imdbRating"] is not None]
lb = [(o["letterboxdStars"], linked[k]["imdbRating"]) for k, o in out.items() if o["letterboxdN"] >= 3 and k in linked and linked[k]["imdbRating"] is not None]
by_era = {}
for k, o in out.items():
    y = films[k]["year"]
    era = f"{y - (y % 5)}–{y - (y % 5) + 4}"
    e = by_era.setdefault(era, [0, 0])
    e[0] += 1
    e[1] += 1 if o["positive"] + o["negative"] >= 10 else 0
print(f"films searched: {total}; with any post: {with_any}; with 10+ English posts that have a clear tone: {len(with10)}")
print(f"net sentiment vs IMDb rating (films with 10+ toned posts): r = {corr(*zip(*pairs)) if len(pairs) > 2 else None} over {len(pairs)} films")
print(f"Letterboxd stars shared on Bluesky vs IMDb rating (3+ shares): r = {corr(*zip(*lb)) if len(lb) > 2 else None} over {len(lb)} films")
print("by era (films, with 10+ toned posts):", {k: tuple(v) for k, v in sorted(by_era.items())})
