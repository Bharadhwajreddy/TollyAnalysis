"""Builds Tolly_Index_Workbook.xlsx (run through scripts/tolly/workbook/build.sh): start page, dashboard, formula book, live film and hero
calculators, the input sheets, and the full Tolly Index calculation — every number an Excel formula."""
import json
import os
import re
import sys
from datetime import date

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, DataBarRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.formula import ArrayFormula

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
BUNDLE = sys.argv[1]
OUT = sys.argv[2]
data = json.load(open(BUNDLE))
site_photos = set(json.load(open(os.path.join(ROOT, "lib/data/hero-photos.json"))))
AS_OF = date.fromisoformat(data["meta"]["asOf"])
AS_OF_TEXT = f"{AS_OF.day} {AS_OF.strftime('%B %Y')}"
VERSION = data["meta"]["version"]
films = data["films"]
heroes = data["heroes"]
NF = len(films)
NH = len(heroes)
LF = NF + 1  # last film row
LH = NH + 1
EX_FILM = "Kithakithalu"
EX_HERO = "Allari Naresh"
KR = next(i for i, f in enumerate(films, start=2) if f["id"] == EX_FILM)
HR = next(i for i, h in enumerate(heroes, start=2) if h["name"] == EX_HERO)

FONT = "Arial"
NAVY, AMBER, CREAM = "14213D", "E9A23B", "FBF7F0"
f_body = Font(name=FONT, size=10)
f_small = Font(name=FONT, size=9, color="595959")
f_input = Font(name=FONT, size=10, color="0000FF")
f_input_big = Font(name=FONT, size=12, bold=True, color="0000FF")
f_link = Font(name=FONT, size=10, color="008000")
f_ref = Font(name=FONT, size=10, color="808080", italic=True)
f_head = Font(name=FONT, size=10, bold=True, color="FFFFFF")
f_title = Font(name=FONT, size=18, bold=True, color=NAVY)
f_sub = Font(name=FONT, size=11, color="4A5568")
f_h2 = Font(name=FONT, size=13, bold=True, color=NAVY)
f_sec = Font(name=FONT, size=11, bold=True, color="FFFFFF")
f_bold = Font(name=FONT, size=10, bold=True)
f_val = Font(name=FONT, size=11, bold=True)
f_result = Font(name=FONT, size=14, bold=True, color="9C5700")
f_eq = Font(name=FONT, size=12, bold=True, color=NAVY)
f_tile_lbl = Font(name=FONT, size=9, bold=True, color="4A5568")
f_tile_val = Font(name=FONT, size=20, bold=True, color=NAVY)
f_hyper = Font(name=FONT, size=11, bold=True, color="0563C1", underline="single")
fill_navy = PatternFill("solid", fgColor=NAVY)
fill_in = PatternFill("solid", fgColor="1F4E79")
fill_ctx = PatternFill("solid", fgColor="7F7F7F")
fill_calc = PatternFill("solid", fgColor="375623")
fill_ref = PatternFill("solid", fgColor="A6A6A6")
fill_yellow = PatternFill("solid", fgColor="FFFF00")
fill_light_yellow = PatternFill("solid", fgColor="FFF2CC")
fill_cream = PatternFill("solid", fgColor=CREAM)
fill_amber = PatternFill("solid", fgColor="FCE4C0")
fill_blue = PatternFill("solid", fgColor="DDEBF7")
fill_green = PatternFill("solid", fgColor="C6EFCE")
fill_red = PatternFill("solid", fgColor="FFC7CE")
fill_grey = PatternFill("solid", fgColor="EDEDED")
thin = Side(style="thin", color="BFBFBF")
box = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap = Alignment(wrap_text=True, vertical="top")
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
left_mid = Alignment(horizontal="left", vertical="center", wrap_text=True)

wb = Workbook()
T = "'Tolly Index Films'"
TH = "'Tolly Index Heroes'"


def header(ws, cols, fills, row=1, height=42, freeze_col=3):
    for i, (nm, fill) in enumerate(zip(cols, fills), start=1):
        c = ws.cell(row=row, column=i, value=nm)
        c.font = f_head
        c.fill = fill
        c.alignment = center
        c.border = Border(bottom=thin)
    ws.row_dimensions[row].height = height
    if freeze_col:
        ws.freeze_panes = ws.cell(row=row + 1, column=freeze_col)


def widths(ws, ws_widths, start=1):
    for i, w in enumerate(ws_widths, start=start):
        ws.column_dimensions[get_column_letter(i)].width = w


def name(nm, ref):
    wb.defined_names[nm] = DefinedName(nm, attr_text=ref)


def months(d, a="AsOf"):
    return f"((YEAR({a})-YEAR({d}))*12+MONTH({a})-MONTH({d})-IF(DAY({a})<DAY({d}),1,0))"


# ───────────────────────────── sheet shells (order set at the end) ─────────────────────────────
sh = wb.active
sh.title = "Start Here"
db = wb.create_sheet("Dashboard")
fb = wb.create_sheet("Formulas")
fc = wb.create_sheet("Film Calculator")
hcalc = wb.create_sheet("Hero Calculator")

# ───────────────────────────── Settings ─────────────────────────────
st = wb.create_sheet("Settings")
st["A1"] = "Settings: every constant the Tolly Index formulas use"
st["A1"].font = f_title
st["A2"] = "Yellow cells are inputs: change one and every sheet recalculates. Each has a name (column A) that the formulas use instead of a cell address."
st["A2"].font = f_sub
settings = [
    ("AsOf", "As-of date (age is measured to this day)", AS_OF, "Date the data was collected", "yyyy-mm-dd"),
    ("W_Rating", "Weight: Rating pillar", 0.5, "Proposal weights 35/30/20/15 with Voice; Voice's share split pro rata until it exists", "0.00"),
    ("W_Reach", "Weight: Reach pillar", 0.3, "", "0.00"),
    ("W_Stay", "Weight: Staying power pillar", 0.2, "", "0.00"),
    ("W_Voice", "Weight: Voice pillar (not collected yet)", 0, "Becomes 0.15 when social-media sentiment is collected (then 0.35 / 0.30 / 0.20 / 0.15)", "0.00"),
    ("Reach_Votes", "Reach: share from IMDb votes", 2 / 3, "", "0.000"),
    ("Reach_Editions", "Reach: share from Wikipedia language editions", 1 / 3, "", "0.000"),
    ("MinVotes", "Minimum IMDb votes for a film to be scored", 10, "Below this, the shrunk rating is ~97% the era average", "0"),
    ("MinAge", "Months before a film counts (younger = provisional)", 24, "", "0"),
    ("CohortYears", "Era cohort: years either side of the release year", 1, "Cohort = films released within this many years", "0"),
    ("FullConf", "Votes for full confidence (c = 1)", 1000, "c = min(1, log10(1+votes) / log10(FullConf))", "#,##0"),
    ("HeroMin", "Hero needs at least this many complete films", 5, "", "0"),
    ("HeroShare", "Hero needs this share of judged films complete", 0.9, "", "0%"),
    ("HeroPrior", "Average films added to every hero (k)", 3, "Pulls small careers toward the all-film mean", "0"),
    ("W_Fame", "Weight: Fame in the final hero index", 0.15, "Final = (1 − w) × hero TI + w × Fame, only while FameOn is TRUE", "0.00"),
    ("FameFloor", "Fame: log10 of followers that scores 0", 4, "4 = 10,000 followers", "0"),
    ("FameCeiling", "Fame: log10 of followers that scores 100", 8, "8 = 100 million followers", "0"),
]
for c, h in zip("ABCD", ["Name", "Setting", "Value", "Why / note"]):
    st[f"{c}4"] = h
    st[f"{c}4"].font = f_head
    st[f"{c}4"].fill = fill_in
for i, (nm, label, val, note, fmt) in enumerate(settings, start=5):
    st[f"A{i}"] = nm
    st[f"B{i}"] = label
    st[f"C{i}"] = val
    st[f"C{i}"].font = f_input
    st[f"C{i}"].number_format = fmt
    st[f"C{i}"].fill = fill_light_yellow
    st[f"D{i}"] = note
    for c in "ABD":
        st[f"{c}{i}"].font = f_body
    st[f"A{i}"].font = f_bold
    name(nm, f"Settings!$C${i}")
r = 5 + len(settings)
st[f"A{r}"] = "AllMean"
st[f"B{r}"] = "M: mean Tolly Index of all complete films"
st[f"C{r}"] = "=ROUND(AVERAGEIFS(%s!$Z$2:$Z$%d,%s!$I$2:$I$%d,\"Complete\"),4)" % (T, LF, T, LF)
st[f"C{r}"].number_format = "0.00"
st[f"D{r}"] = "Calculated: used in the hero formula as the 'average film'"
for c in "ABCD":
    st[f"{c}{r}"].font = f_body
st[f"A{r}"].font = f_bold
name("AllMean", f"Settings!$C${r}")
ALLMEAN_ROW = r
r += 1
st[f"A{r}"] = "WeightCheck"
st[f"B{r}"] = "Weights add up to (must be 1)"
st[f"C{r}"] = "=W_Rating+W_Reach+W_Stay+W_Voice"
st[f"C{r}"].number_format = "0.00"
for c in "ABC":
    st[f"{c}{r}"].font = f_body
st[f"A{r}"].font = f_bold
r += 1
st[f"A{r}"] = "FameOn"
st[f"B{r}"] = "Fame counts (every ranked hero has a recent follower count, or no account)"
st[f"C{r}"] = (f"=AND(COUNTIF('Tolly Index Heroes'!$M$2:$M${LH},\"Yes\")>0,"
               f"SUMPRODUCT(('Tolly Index Heroes'!$M$2:$M${LH}=\"Yes\")*('Tolly Index Heroes'!$AA$2:$AA${LH}=\"\")*(Heroes!$R$2:$R${LH}<>\"Yes\"))=0)")
st[f"D{r}"] = "Calculated: switches fame on for everyone at once, so no two heroes are compared on different bases"
for c in "ABCD":
    st[f"{c}{r}"].font = f_body
st[f"A{r}"].font = f_bold
name("FameOn", f"Settings!$C${r}")
widths(st, [16, 50, 14, 80])

# ───────────────────────────── Movies (inputs) ─────────────────────────────
mv = wb.create_sheet("Movies")
mcols = [
    ("Film ID", 30, "in"), ("Title", 28, "in"), ("Release year (filmography)", 11, "in"), ("Lead hero(s)", 22, "in"),
    ("Exact release date", 12, "in"), ("Release date source", 12, "in"), ("Telugu original? (Yes/No)", 10, "in"), ("Language source", 12, "in"),
    ("IMDb ID", 12, "in"), ("IMDb link method", 18, "in"), ("IMDb rating (/10)", 9, "in"), ("IMDb votes", 10, "in"),
    ("Release year on Wikidata", 10, "in"), ("Release year on IMDb", 10, "in"), ("Wikidata ID", 11, "in"), ("English Wikipedia article", 24, "in"),
    ("Telugu Wikipedia article", 18, "in"), ("Wikipedia language editions", 10, "in"), ("English page views (60 days)", 11, "in"),
    ("Telugu page views (60 days)", 11, "in"), ("Director", 18, "ctx"), ("Music director", 16, "ctx"), ("Runtime (min)", 8, "ctx"),
    ("Genres", 16, "ctx"), ("Budget (reported, context only)", 14, "ctx"), ("Worldwide gross (reported, context only)", 14, "ctx"),
    ("Box-office verdict (context only)", 11, "ctx"), ("Verdict source", 12, "ctx"), ("Critics' average (/10, cross-check)", 10, "ctx"),
    ("Critics' scores quoted", 9, "ctx"),
]
header(mv, [c[0] for c in mcols], [fill_in if c[2] == "in" else fill_ctx for c in mcols])
widths(mv, [c[1] for c in mcols])
for i, f in enumerate(films, start=2):
    row = [
        f["id"], f["title"], f["year"], f["heroes"], date.fromisoformat(f["date"]) if f["date"] else None, f["dateBy"],
        {True: "Yes", False: "No"}.get(f["telugu"]), f["langBy"], f["imdb"], f["imdbBy"], f["rating"], f["votes"],
        f["wdYear"], f["imdbYear"], f["qid"], f["en"], f["te"], f["editions"], f["enViews"], f["teViews"],
        f["director"], f["music"], f["runtime"], f["genres"] or None, f["budget"], f["gross"], f["verdict"], f["verdictBy"],
        f["critics"], f["criticsN"],
    ]
    for j, v in enumerate(row, start=1):
        c = mv.cell(row=i, column=j, value=v)
        c.font = f_input if j <= 20 else f_body
    mv.cell(row=i, column=5).number_format = "yyyy-mm-dd"
    for col in (12, 19, 20):
        mv.cell(row=i, column=col).number_format = "#,##0"
mv.auto_filter.ref = f"A1:{get_column_letter(len(mcols))}{LF}"
for col in ["G", "I", "K", "L", "R", "S", "T"]:
    mv.conditional_formatting.add(f"{col}2:{col}{LF}", FormulaRule(formula=[f'AND($G2<>"No",ISBLANK({col}2))'], fill=fill_yellow))
mv.conditional_formatting.add(f"M2:N{LF}", FormulaRule(formula=['AND($G2<>"No",ISBLANK($M2),ISBLANK($N2))'], fill=fill_yellow))
mv["K1"].comment = Comment(f"{data['meta']['sources']['imdb']}. Personal, non-commercial use only: do not publish these two columns.", "Tolly Index")
mv["S1"].comment = Comment(f"{data['meta']['sources']['wikipedia']}. 0 = the film has no article in that language.", "Tolly Index")

# ───────────────────────────── Heroes (inputs) ─────────────────────────────
hv = wb.create_sheet("Heroes")
hcols = [
    ("Hero ID", 20, "in"), ("Name", 22, "in"), ("Wikidata ID", 11, "in"), ("IMDb person ID(s)", 14, "in"), ("Wikipedia article", 22, "in"),
    ("Filmography page", 24, "in"), ("Birth date", 12, "ctx"), ("Birth date source", 11, "ctx"), ("Career start (year)", 9, "ctx"),
    ("Career start source", 11, "ctx"), ("Free-licence photo?", 9, "ctx"), ("X followers (context only)", 12, "ctx"), ("X followers as of", 11, "ctx"),
    ("X handle", 16, "ctx"), ("Instagram followers (reported, context only)", 14, "ctx"),
    ("Followers for fame (official platforms added up, counts ≤ 1 year old)", 16, "in"), ("Followers counted as of", 11, "in"),
    ("No official account? (Yes = scored on films alone)", 11, "in"),
]
header(hv, [c[0] for c in hcols], [fill_in if c[2] == "in" else fill_ctx for c in hcols])
widths(hv, [c[1] for c in hcols])
for i, h in enumerate(heroes, start=2):
    row = [h["slug"], h["name"], h["qid"], h["imdb"] or None, h["article"], h["filmography"],
           date.fromisoformat(h["birth"]) if h["birth"] else None, h["birthBy"], h["debut"], h["debutBy"],
           "Yes" if h["photo"] or h["slug"] in site_photos else "No", h["x"], date.fromisoformat(h["xDate"]) if h["xDate"] else None, h["xUser"], h["ig"],
           h.get("fameFollowers"), date.fromisoformat(h["fameDate"]) if h.get("fameDate") else None, "Yes" if h.get("noAccount") else None]
    for j, v in enumerate(row, start=1):
        hv.cell(row=i, column=j, value=v).font = f_input
    hv.cell(row=i, column=7).number_format = "yyyy-mm-dd"
    hv.cell(row=i, column=13).number_format = "yyyy-mm-dd"
    hv.cell(row=i, column=12).number_format = "#,##0"
    hv.cell(row=i, column=15).number_format = "#,##0"
    hv.cell(row=i, column=16).number_format = "#,##0"
    hv.cell(row=i, column=17).number_format = "yyyy-mm-dd"
hv.auto_filter.ref = f"A1:{get_column_letter(len(hcols))}{LH}"
hv["O1"].comment = Comment("From one dated press article (Andhravilas, 3 Oct 2026). Blank = not reported. Not used in the index.", "Tolly Index")

# ───────────────────────────── Tolly Index Films (formulas) ─────────────────────────────
# (column, step code, header, width, maths, plain words) — the Formulas sheet is built from this list.
FSTEPS = [
    ("A", "", "Film ID", 30, "", ""),
    ("B", "", "Title", 26, "", ""),
    ("C", "", "Year y", 7, "", ""),
    ("D", "F1", "Total page views (60 days)", 10, "views = English views + Telugu views", "Wikipedia readers of the film in the last 60 days, both languages. Blank if either is unknown."),
    ("E", "F2", "Year confirmed by a 2nd source?", 10, "|Wikidata year − y| ≤ 1  OR  |IMDb year − y| ≤ 1", "Gate check 3: a second source agrees on the release year (within a year)."),
    ("F", "F3", "Age (months)", 8, "whole months from release date to AsOf", "Only when the exact release date is known."),
    ("G", "F4", "Age check", 9, "Old if age ≥ 24 months · Young if < 24 · Unknown if the year alone can't tell", "Gate check 6: films under two years old are provisional (they are still being rated)."),
    ("H", "F5", "Missing inputs (gate)", 30, "list of failed checks", "The six gate checks, written out: anything listed here stops the film from being scored."),
    ("I", "F6", "Status", 11, "Excluded (not Telugu) → Provisional (Young) → Complete (nothing missing) → else Incomplete", "The film's status, in that order of priority."),
    ("J", "F7", "In cohorts? (1 = yes)", 9, "1 if Complete, or Provisional with nothing missing", "Which films the era averages and percentiles are built from."),
    ("K", "F8", "Votes v", 9, "v = IMDb votes (scored films only)", "Copied from Movies so cohort formulas only see scored films."),
    ("L", "F9", "Rating R", 7, "R = IMDb rating /10", ""),
    ("M", "F10", "Editions e", 8, "e = Wikipedia language editions", ""),
    ("N", "F11", "Cohort films n", 8, "n = scored films with year in [y − 1, y + 1]", "Looked up from Era Cohorts for the film's year."),
    ("O", "F12", "Cohort median votes m", 9, "m = median v of the cohort", "The 'typical' number of voters for films of that time."),
    ("P", "F13", "Cohort mean rating C", 9, "C = mean R of the cohort", "The average rating of films of that time."),
    ("Q", "F14", "Shrunk rating R′", 9, "R′ = v/(v+m) × R + m/(v+m) × C", "Few voters → pulled toward the era average C; many voters → stays close to R."),
    ("R", "F15", "RATING pillar (0–100)", 9, "Rating = ROUND((R′ − 1) / 9 × 100, 1)", "IMDb's 1–10 scale stretched to 0–100. Same scale in every era."),
    ("S", "F16", "Votes percentile", 9, "pct = (below + (tied − 1)/2) / (n − 1) × 100   (50 if n ≤ 1)", "Share of same-era films with fewer votes; ties count half; the film is not compared with itself."),
    ("T", "F17", "Editions percentile", 9, "same percentile, on e", ""),
    ("U", "F18", "REACH pillar (0–100)", 9, "Reach = ROUND(⅔ × pct(votes) + ⅓ × pct(editions), 1)", "How many people cared, against films of the same years."),
    ("V", "F19", "STAY pillar (0–100)", 9, "Stay = ROUND(pct(views), 1)", "Do people still read about it today, against films of the same years."),
    ("W", "F20", "Raw score", 8, "raw = ROUND(0.5 × Rating + 0.3 × Reach + 0.2 × Stay, 1)", "The weighted mix of the three pillars (weights on Settings)."),
    ("X", "F21", "Confidence c", 9, "c = ROUND(MIN(1, log10(1 + v) / log10(1000)), 3)", "How much evidence: 10 votes → 0.35, 100 → 0.67, 1,000+ → 1."),
    ("Y", "F22", "Cohort mean raw", 9, "mean raw score of the cohort", "Where a film with no evidence would land."),
    ("Z", "F23", "TOLLY INDEX", 9, "TI = ROUND(c × raw + (1 − c) × cohort mean raw, 1)", "The film's Tolly Index (0–100). Little evidence → pulled to the era's typical film."),
    ("AA", "", "App value (check)", 9, "", ""),
    ("AB", "", "Difference", 8, "", ""),
    ("AC", "", "Sort key (top films)", 9, "", ""),
]
tf = wb.create_sheet("Tolly Index Films")
header(tf, [f"{s[1]} · {s[2]}" if s[1] else s[2] for s in FSTEPS], [fill_calc] * 26 + [fill_ref] * 3, height=66)
widths(tf, [s[3] for s in FSTEPS])
for s in FSTEPS:
    if s[4]:
        tf[f"{s[0]}1"].comment = Comment(f"{s[1]}: {s[4]}\n\n{s[5]}".strip(), "Tolly Index", width=320, height=150)


def cohort_count(r, extra=""):
    return f"COUNTIFS($J$2:$J${LF},1,$C$2:$C${LF},\">=\"&($C{r}-CohortYears),$C$2:$C${LF},\"<=\"&($C{r}+CohortYears){extra})"


def pct(r, col):
    below = cohort_count(r, f",${col}$2:${col}${LF},\"<\"&{col}{r}")
    equal = cohort_count(r, f",${col}$2:${col}${LF},{col}{r}")
    return f"IF(N{r}<=1,50,({below}+({equal}-1)/2)/(N{r}-1)*100)"


EC = "'Era Cohorts'"
for i, f in enumerate(films, start=2):
    r = i
    fm = {
        "A": f"=Movies!A{r}",
        "B": f"=Movies!B{r}",
        "C": f"=Movies!C{r}",
        "D": f'=IF(OR(Movies!S{r}="",Movies!T{r}=""),"",Movies!S{r}+Movies!T{r})',
        "E": f'=IF(OR(AND(Movies!M{r}<>"",ABS(Movies!M{r}-C{r})<=1),AND(Movies!N{r}<>"",ABS(Movies!N{r}-C{r})<=1)),"Yes","No")',
        "F": f'=IF(Movies!E{r}="","",{months(f"Movies!E{r}")})',
        "G": f'=IF(Movies!E{r}<>"",IF(F{r}>=MinAge,"Old","Young"),IF({months(f"DATE(C{r},12,31)")}>=MinAge,"Old",IF({months(f"DATE(C{r},1,1)")}<MinAge,"Young","Unknown")))',
        "H": (
            f'=TRIM(IF(Movies!G{r}="","original language; ","")'
            f'&IF(Movies!I{r}="","IMDb title; ",IF(OR(Movies!K{r}="",N(Movies!L{r})<MinVotes),"IMDb rating with "&MinVotes&"+ votes; ",""))'
            f'&IF(E{r}="No","release year from a second source; ","")'
            f'&IF(Movies!R{r}="","Wikipedia language editions; ","")'
            f'&IF(D{r}="","Wikipedia page views; ","")'
            f'&IF(AND(G{r}="Unknown",Movies!G{r}<>"No"),"exact release date; ",""))'
        ),
        "I": f'=IF(Movies!G{r}="No","Excluded",IF(G{r}="Young","Provisional",IF(H{r}="","Complete","Incomplete")))',
        "J": f'=IF(OR(I{r}="Complete",AND(I{r}="Provisional",H{r}="")),1,0)',
        "K": f'=IF(J{r}=1,Movies!L{r},"")',
        "L": f'=IF(J{r}=1,Movies!K{r},"")',
        "M": f'=IF(J{r}=1,Movies!R{r},"")',
        "N": f'=IF(J{r}=1,INDEX({EC}!$B$2:$B$40,MATCH(C{r},{EC}!$A$2:$A$40,0)),"")',
        "O": f'=IF(J{r}=1,INDEX({EC}!$C$2:$C$40,MATCH(C{r},{EC}!$A$2:$A$40,0)),"")',
        "P": f'=IF(J{r}=1,INDEX({EC}!$D$2:$D$40,MATCH(C{r},{EC}!$A$2:$A$40,0)),"")',
        "Q": f'=IF(J{r}=1,K{r}/(K{r}+O{r})*L{r}+O{r}/(K{r}+O{r})*P{r},"")',
        "R": f'=IF(J{r}=1,ROUND((Q{r}-1)/9*100,1),"")',
        "S": f'=IF(J{r}=1,{pct(r, "K")},"")',
        "T": f'=IF(J{r}=1,{pct(r, "M")},"")',
        "U": f'=IF(J{r}=1,ROUND(Reach_Votes*S{r}+Reach_Editions*T{r},1),"")',
        "V": f'=IF(J{r}=1,ROUND({pct(r, "D")},1),"")',
        "W": f'=IF(J{r}=1,ROUND(W_Rating*R{r}+W_Reach*U{r}+W_Stay*V{r},1),"")',
        "X": f'=IF(J{r}=1,ROUND(MIN(1,LOG10(1+K{r})/LOG10(FullConf)),3),"")',
        "Y": f'=IF(J{r}=1,INDEX({EC}!$E$2:$E$40,MATCH(C{r},{EC}!$A$2:$A$40,0)),"")',
        "Z": f'=IF(J{r}=1,ROUND(X{r}*W{r}+(1-X{r})*Y{r},1),"")',
        "AB": f'=IF(AND(ISNUMBER(Z{r}),ISNUMBER(AA{r})),ROUND(Z{r}-AA{r},1),"")',
        "AC": f'=IF(AND(I{r}="Complete",ISNUMBER(Z{r})),Z{r}-ROW()/100000000,"")',
    }
    for col, v in fm.items():
        c = tf[f"{col}{r}"]
        c.value = v
        c.font = f_link if col in ("A", "B", "C") else f_body
    tf[f"AA{r}"] = f["appIndex"]
    tf[f"AA{r}"].font = f_ref
    tf[f"AC{r}"].font = f_ref
    tf[f"Z{r}"].font = f_bold
    tf[f"Q{r}"].number_format = "0.00"
    tf[f"S{r}"].number_format = "0.0"
    tf[f"T{r}"].number_format = "0.0"
    tf[f"D{r}"].number_format = "#,##0"
    tf[f"K{r}"].number_format = "#,##0"
    tf[f"O{r}"].number_format = "#,##0.0"
    tf[f"P{r}"].number_format = "0.000"
    tf[f"X{r}"].number_format = "0.000"
    tf[f"Y{r}"].number_format = "0.00"
    tf[f"AC{r}"].number_format = "0.000000"
    tf[f"H{r}"].alignment = Alignment(wrap_text=False)
tf.auto_filter.ref = f"A1:AC{LF}"
status_fills = {"Complete": fill_green, "Provisional": fill_blue, "Incomplete": PatternFill("solid", fgColor="FFEB9C"), "Excluded": fill_grey}
for s, fl in status_fills.items():
    tf.conditional_formatting.add(f"I2:I{LF}", CellIsRule(operator="equal", formula=[f'"{s}"'], fill=fl))
tf.conditional_formatting.add(f"Z2:Z{LF}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=100, color="E9A23B"))
tf["AA1"].comment = Comment("The value the app computed (lib/data/tolly/films.json). Kept only as a check: Difference should be 0.", "Tolly Index")
tf["AC1"].comment = Comment("Helper for the Dashboard's top-films list: the index with a tiny row-based tie-break.", "Tolly Index")

# ───────────────────────────── Era Cohorts (formulas) ─────────────────────────────
ec = wb.create_sheet("Era Cohorts")
years = sorted({f["year"] for f in films})
ESTEPS = [
    ("A", "", "Release year y", 9, "", ""),
    ("B", "E1", "Films in cohort n", 10, "n = COUNT of scored films with year in [y − 1, y + 1]", "How many films a film of year y is compared with."),
    ("C", "E2", "Median IMDb votes m", 12, "m = MEDIAN(v) over the cohort", "Array formula: MEDIAN(IF(in cohort, votes))."),
    ("D", "E3", "Mean IMDb rating C", 12, "C = AVERAGE(R) over the cohort", ""),
    ("E", "E4", "Mean raw score", 11, "AVERAGE(raw) over the cohort", "Where a film with no evidence would land."),
    ("F", "", "Complete films released this year", 12, "", ""),
]
header(ec, [f"{s[1]} · {s[2]}" if s[1] else s[2] for s in ESTEPS], [fill_calc] * len(ESTEPS), height=54, freeze_col=2)
widths(ec, [s[3] for s in ESTEPS])
for s in ESTEPS:
    if s[4]:
        ec[f"{s[0]}1"].comment = Comment(f"{s[1]}: {s[4]}\n\n{s[5]}".strip(), "Tolly Index", width=300, height=120)
J = f"{T}!$J$2:$J${LF}"
C = f"{T}!$C$2:$C${LF}"
EX_YEAR_ROW = None
for i, y in enumerate(years, start=2):
    if y == next(f["year"] for f in films if f["id"] == EX_FILM):
        EX_YEAR_ROW = i
    ec[f"A{i}"] = y
    ec[f"A{i}"].font = f_input
    crit = f'{J},1,{C},">="&($A{i}-CohortYears),{C},"<="&($A{i}+CohortYears)'
    ec[f"B{i}"] = f"=COUNTIFS({crit})"
    cond = f"({J}=1)*({C}>=$A{i}-CohortYears)*({C}<=$A{i}+CohortYears)"
    ec[f"C{i}"] = ArrayFormula(f"C{i}", f'=IF(B{i}=0,"",MEDIAN(IF({cond},{T}!$K$2:$K${LF})))')
    ec[f"D{i}"] = f'=IF(B{i}=0,"",AVERAGEIFS({T}!$L$2:$L${LF},{crit}))'
    ec[f"E{i}"] = f'=IF(B{i}=0,"",AVERAGEIFS({T}!$W$2:$W${LF},{crit}))'
    ec[f"F{i}"] = f'=COUNTIFS({T}!$C$2:$C${LF},$A{i},{T}!$I$2:$I${LF},"Complete")'
    for c in "BCDEF":
        ec[f"{c}{i}"].font = f_body
    ec[f"C{i}"].number_format = "#,##0.0"
    ec[f"D{i}"].number_format = "0.000"
    ec[f"E{i}"].number_format = "0.00"
assert len(years) <= 39

# ───────────────────────────── Credits (hero × film, formulas) ─────────────────────────────
cr = wb.create_sheet("Credits")
pairs = []
name_by_slug = {h["slug"]: h["name"] for h in heroes}
year_by_id = {f["id"]: f["year"] for f in films}
for f in films:
    for s in f["heroSlugs"]:
        pairs.append((s, f["id"]))
pairs.sort(key=lambda p: (name_by_slug[p[0]], year_by_id[p[1]], p[1]))
NC = len(pairs)
LC = NC + 1
ccols = [("Hero ID", 18), ("Hero", 20), ("Film ID", 30), ("Film", 24), ("Year", 7), ("Status", 11), ("Confidence c", 9), ("Film Tolly Index", 9),
         ("c × Index", 9), ("Index²", 9), ("c × Rating", 9), ("c × Reach", 9), ("c × Stay", 9), ("Row on Tolly Index Films", 9)]
header(cr, [c[0] for c in ccols], [fill_in, fill_calc, fill_in] + [fill_calc] * 11)
widths(cr, [c[1] for c in ccols])
for i, (s, fid) in enumerate(pairs, start=2):
    cr[f"A{i}"] = s
    cr[f"C{i}"] = fid
    cr[f"A{i}"].font = f_input
    cr[f"C{i}"].font = f_input
    cr[f"B{i}"] = f"=INDEX(Heroes!$B$2:$B${LH},MATCH(A{i},Heroes!$A$2:$A${LH},0))"
    cr[f"N{i}"] = f"=MATCH(C{i},{T}!$A$2:$A${LF},0)"
    cr[f"D{i}"] = f"=INDEX({T}!$B$2:$B${LF},N{i})"
    cr[f"E{i}"] = f"=INDEX({T}!$C$2:$C${LF},N{i})"
    cr[f"F{i}"] = f"=INDEX({T}!$I$2:$I${LF},N{i})"
    cr[f"G{i}"] = f'=IF(F{i}="Complete",INDEX({T}!$X$2:$X${LF},N{i}),"")'
    cr[f"H{i}"] = f'=IF(F{i}="Complete",INDEX({T}!$Z$2:$Z${LF},N{i}),"")'
    cr[f"I{i}"] = f'=IF(F{i}="Complete",G{i}*H{i},"")'
    cr[f"J{i}"] = f'=IF(F{i}="Complete",H{i}^2,"")'
    cr[f"K{i}"] = f'=IF(F{i}="Complete",G{i}*INDEX({T}!$R$2:$R${LF},N{i}),"")'
    cr[f"L{i}"] = f'=IF(F{i}="Complete",G{i}*INDEX({T}!$U$2:$U${LF},N{i}),"")'
    cr[f"M{i}"] = f'=IF(F{i}="Complete",G{i}*INDEX({T}!$V$2:$V${LF},N{i}),"")'
    for c in "BDEFGHIJKLMN":
        cr[f"{c}{i}"].font = f_link if c in "BDE" else f_body
    cr[f"I{i}"].number_format = "0.00"
    cr[f"G{i}"].number_format = "0.000"
cr.auto_filter.ref = f"A1:N{LC}"

# ───────────────────────────── Tolly Index Heroes (formulas) ─────────────────────────────
HSTEPS = [
    ("A", "", "Hero ID", 18, "", ""),
    ("B", "", "Hero", 22, "", ""),
    ("C", "H1", "Lead films since 2000", 9, "COUNT of his rows on Credits", "Every film where he is a lead."),
    ("D", "H2", "Not Telugu (excluded)", 9, "COUNT with Status = Excluded", "Dubbed / other-language films are not his Telugu record."),
    ("E", "H3", "Under 2 years (provisional)", 10, "COUNT with Status = Provisional", "Too new to judge; not counted yet."),
    ("F", "H4", "Complete films", 9, "COUNT with Status = Complete", "Films that passed every gate check."),
    ("G", "H5", "Judged films", 8, "judged = lead films − excluded − provisional", ""),
    ("H", "H6", "Share complete", 9, "share = complete / judged", "Hero rule: must be at least 90%."),
    ("I", "H7", "Σ c", 8, "Σ c over his complete films", "Total evidence behind his score."),
    ("J", "H8", "Σ c × Index", 10, "Σ (c × film TI) over his complete films", ""),
    ("K", "H9", "Mean index (complete)", 9, "plain average of his films' TI", "For the spread only."),
    ("L", "H10", "Spread (consistency)", 9, "spread = SQRT(mean(TI²) − mean(TI)²)", "Population standard deviation of his films' TI: how much his films vary."),
    ("M", "H11", "Ranked?", 8, "Yes if complete ≥ 5 AND share ≥ 90%", "We never rank a hero on a patchy record."),
    ("N", "H12", "Why not ranked", 34, "the rule he fails, in words", ""),
    ("O", "H13", "Hero TI (films)", 10, "Hero TI = ROUND((Σ c × TI + k × M) / (Σ c + k), 1)   k = 3, M = mean TI of all complete films", "Evidence-weighted average of his films, plus three 'average films' so a short career can't top a long strong one."),
    ("P", "H14", "± band", 7, "band = ROUND(1.96 × spread / √(Σ c + k), 1)", "95% range: heroes whose ranges overlap are about level."),
    ("Q", "H15", "Rank", 6, "rank = 1 + number of heroes with a higher index", "Ties share a rank."),
    ("R", "H16", "Rating profile", 9, "Σ (c × Rating) / Σ c", "His confidence-weighted pillar averages."),
    ("S", "H16", "Reach profile", 9, "Σ (c × Reach) / Σ c", ""),
    ("T", "H16", "Stay profile", 9, "Σ (c × Stay) / Σ c", ""),
    ("U", "H17", "Best film index", 9, "MAX of his films' TI", ""),
    ("V", "H17", "Best film", 26, "the film with that TI", "Array formula: INDEX/MATCH on hero, status and index."),
    ("W", "", "App value (check)", 9, "", ""),
    ("X", "", "Difference", 8, "", ""),
    ("Y", "", "Sort key (ranking)", 9, "", ""),
    ("Z", "", "Not-ranked # (helper)", 9, "", ""),
    ("AA", "H19", "Fame (0–100)", 9, "Fame = ROUND(MIN(100, MAX(0, (log10(followers) − 4) ÷ 4 × 100)), 1)", "Official followers added up (Heroes column P), log scale: 10k = 0, 1M = 50, 100M = 100."),
    ("AB", "H20", "FINAL TOLLY INDEX", 10, "Final = ROUND(0.85 × hero TI + 0.15 × Fame, 1) while FameOn; otherwise the hero TI", "Fame counts only when every ranked hero has a recent follower count (or has no account)."),
    ("AC", "H21", "Final ± band", 8, "band × (1 − 0.15), rounded, while fame applies", ""),
]
th = wb.create_sheet("Tolly Index Heroes")
header(th, [f"{s[1]} · {s[2]}" if s[1] else s[2] for s in HSTEPS], [fill_calc] * 22 + [fill_ref] * 4 + [fill_calc] * 3, height=66)
widths(th, [s[3] for s in HSTEPS])
for s in HSTEPS:
    if s[4]:
        th[f"{s[0]}1"].comment = Comment(f"{s[1]}: {s[4]}\n\n{s[5]}".strip(), "Tolly Index", width=320, height=150)
CA = f"Credits!$A$2:$A${LC}"
CF = f"Credits!$F$2:$F${LC}"


def cs(col):
    return f"Credits!${col}$2:${col}${LC}"


for i, h in enumerate(heroes, start=2):
    r = i
    fm = {
        "A": f"=Heroes!A{r}",
        "B": f"=Heroes!B{r}",
        "C": f"=COUNTIFS({CA},A{r})",
        "D": f'=COUNTIFS({CA},A{r},{CF},"Excluded")',
        "E": f'=COUNTIFS({CA},A{r},{CF},"Provisional")',
        "F": f'=COUNTIFS({CA},A{r},{CF},"Complete")',
        "G": f"=C{r}-D{r}-E{r}",
        "H": f'=IF(G{r}>0,F{r}/G{r},"")',
        "I": f'=SUMIFS({cs("G")},{CA},A{r},{CF},"Complete")',
        "J": f'=SUMIFS({cs("I")},{CA},A{r},{CF},"Complete")',
        "K": f'=IF(F{r}>0,SUMIFS({cs("H")},{CA},A{r},{CF},"Complete")/F{r},"")',
        "L": f'=IF(F{r}>=2,SQRT(MAX(0,SUMIFS({cs("J")},{CA},A{r},{CF},"Complete")/F{r}-K{r}^2)),"")',
        "M": f'=IF(AND(C{r}-D{r}>0,F{r}>=HeroMin,N(H{r})>=HeroShare),"Yes","No")',
        "N": (
            f'=IF(M{r}="Yes","",IF(C{r}-D{r}=0,"no Telugu lead films counted since 2000",IF(F{r}=0,"no complete films (needs "&HeroMin&")",'
            f'IF(F{r}<HeroMin,"only "&F{r}&" complete film"&IF(F{r}=1,"","s")&" (needs "&HeroMin&")",'
            f'F{r}&" of "&G{r}&" films complete ("&ROUND(H{r}*100,0)&"%, needs "&HeroShare*100&"%)"))))'
        ),
        "O": f'=IF(M{r}="Yes",ROUND((J{r}+HeroPrior*AllMean)/(I{r}+HeroPrior),1),"")',
        "P": f'=IF(AND(M{r}="Yes",L{r}<>""),ROUND(1.96*L{r}/SQRT(I{r}+HeroPrior),1),"")',
        "Q": f'=IF(AB{r}="","",COUNTIF($AB$2:$AB${LH},">"&AB{r})+1)',
        "R": f'=IF(I{r}>0,ROUND(SUMIFS({cs("K")},{CA},A{r},{CF},"Complete")/I{r},1),"")',
        "S": f'=IF(I{r}>0,ROUND(SUMIFS({cs("L")},{CA},A{r},{CF},"Complete")/I{r},1),"")',
        "T": f'=IF(I{r}>0,ROUND(SUMIFS({cs("M")},{CA},A{r},{CF},"Complete")/I{r},1),"")',
        "U": f'=IF(F{r}=0,"",_xlfn.MAXIFS({cs("H")},{CA},A{r},{CF},"Complete"))',
        "X": f'=IF(AND(ISNUMBER(AB{r}),ISNUMBER(W{r})),ROUND(AB{r}-W{r},1),"")',
        "Y": f'=IF(ISNUMBER(AB{r}),AB{r}-ROW()/1000000,"")',
        "Z": f'=IF(M{r}="No",COUNTIF($M$2:M{r},"No"),"")',
        "AA": f'=IF(N(Heroes!P{r})>0,ROUND(MAX(0,MIN(100,(LOG10(Heroes!P{r})-FameFloor)/(FameCeiling-FameFloor)*100)),1),"")',
        "AB": f'=IF(O{r}="","",IF(AND(FameOn,AA{r}<>""),ROUND((1-W_Fame)*O{r}+W_Fame*AA{r},1),O{r}))',
        "AC": f'=IF(P{r}="","",IF(AND(FameOn,AA{r}<>""),ROUND(P{r}*(1-W_Fame),1),P{r}))',
    }
    for col, v in fm.items():
        th[f"{col}{r}"] = v
        th[f"{col}{r}"].font = f_link if col in "AB" else f_body
    th[f"V{r}"] = ArrayFormula(f"V{r}", f'=IF(F{r}=0,"",INDEX({cs("D")},MATCH(1,({CA}=A{r})*({CF}="Complete")*({cs("H")}=U{r}),0)))')
    th[f"V{r}"].font = f_body
    th[f"W{r}"] = h["appIndex"]
    for col in "WYZ":
        th[f"{col}{r}"].font = f_ref
    th[f"AB{r}"].font = f_bold
    th[f"H{r}"].number_format = "0%"
    th[f"I{r}"].number_format = "0.00"
    th[f"J{r}"].number_format = "#,##0.00"
    th[f"K{r}"].number_format = "0.0"
    th[f"L{r}"].number_format = "0.0"
    th[f"Y{r}"].number_format = "0.000000"
th.auto_filter.ref = f"A1:AC{LH}"
th.conditional_formatting.add(f"M2:M{LH}", CellIsRule(operator="equal", formula=['"Yes"'], fill=fill_green))
th.conditional_formatting.add(f"M2:M{LH}", CellIsRule(operator="equal", formula=['"No"'], fill=PatternFill("solid", fgColor="FFEB9C")))
th.conditional_formatting.add(f"O2:O{LH}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=100, color="E9A23B"))
th["W1"].comment = Comment("The value the app computed (lib/data/tolly/heroes.json). Kept only as a check: Difference should be 0.", "Tolly Index")

# ───────────────────────────── calculator framework ─────────────────────────────


class Calc:
    """A step-by-step calculator: one row per step — code, what it is, value (live formula),
    the maths, the same maths with this film's numbers, and the exact Excel formula in the value cell."""

    def __init__(self, ws, row):
        self.ws = ws
        self.r = row
        self.addr = {}

    def sub(self, s):
        s = s.replace("@LF@", str(LF)).replace("@LH@", str(LH)).replace("@LC@", str(LC))
        return re.sub(r"\{(\w+)\}", lambda m: self.addr[m.group(1)], s)

    def section(self, title, note=""):
        ws = self.ws
        self.r += 1
        for col in "ABCDEF":
            ws[f"{col}{self.r}"].fill = fill_navy
        ws[f"A{self.r}"] = title
        ws[f"A{self.r}"].font = f_sec
        ws.row_dimensions[self.r].height = 20
        if note:
            self.r += 1
            ws[f"A{self.r}"] = note
            ws[f"A{self.r}"].font = f_small
        self.r += 1

    def step(self, key, code, label, formula, math="", numbers=None, fmt=None, array=False, result=False):
        ws, r = self.ws, self.r
        self.addr[key] = f"$C${r}"
        ws[f"A{r}"] = code
        ws[f"B{r}"] = label
        f = self.sub(formula)
        ws[f"C{r}"] = ArrayFormula(f"C{r}", f) if array else f
        ws[f"D{r}"] = math
        if numbers:
            ws[f"E{r}"] = self.sub(numbers)
        ws[f"F{r}"] = f"=_xlfn.FORMULATEXT(C{r})"
        ws[f"A{r}"].font = f_bold
        ws[f"B{r}"].font = f_body
        ws[f"C{r}"].font = f_result if result else f_val
        ws[f"D{r}"].font = f_body
        ws[f"E{r}"].font = Font(name=FONT, size=10, color="9C5700")
        ws[f"F{r}"].font = Font(name="Consolas", size=9, color="404040")
        for col in "ABCDE":
            ws[f"{col}{r}"].alignment = Alignment(vertical="center", wrap_text=col in "BDE")
        ws[f"F{r}"].alignment = Alignment(vertical="center", wrap_text=False)
        ws[f"C{r}"].alignment = Alignment(horizontal="right", vertical="center")
        for col in "ABCDEF":
            ws[f"{col}{r}"].border = Border(bottom=thin)
        if fmt:
            ws[f"C{r}"].number_format = fmt
        if result:
            ws[f"C{r}"].fill = fill_amber
        self.r += 1
        return f"C{r}"


def calc_head(ws, title, sub):
    ws["A1"] = title
    ws["A1"].font = f_title
    ws["A2"] = sub
    ws["A2"].font = f_sub
    widths(ws, [7, 36, 15, 46, 62, 90])
    hdr = ["Step", "What it is", "Value", "Formula (maths)", "With these numbers", "Excel formula in the Value cell (live)"]
    for i, h in enumerate(hdr, start=1):
        c = ws.cell(row=7, column=i, value=h)
        c.font = f_head
        c.fill = fill_calc
        c.alignment = center
    ws.row_dimensions[7].height = 28
    ws.freeze_panes = "A8"
    ws.sheet_view.showGridLines = False


# ───────────────────────────── Film Calculator ─────────────────────────────
calc_head(fc, "Film Calculator: one film's Tolly Index, step by step",
          "Pick any film in C4. Every value below is recalculated live from the Movies sheet and the era cohort, and column F shows the exact Excel formula.")
fc["B4"] = "Film ID (pick from the list) ▸"
fc["B4"].font = f_bold
fc["C4"] = EX_FILM
fc["C4"].font = f_input_big
fc["C4"].fill = fill_light_yellow
fc["C4"].border = box
fc.merge_cells("C4:D4")
fc["E4"] = "Tip: type or pick any Film ID from the Movies sheet (column A)."
fc["E4"].font = f_small
dv = DataValidation(type="list", formula1=f"Movies!$A$2:$A${LF}", allow_blank=False, showDropDown=False)
dv.error = "Pick a Film ID from the Movies sheet."
fc.add_data_validation(dv)
dv.add("C4")
fc["B5"] = "Position in the film list"
fc["B5"].font = f_body
fc["C5"] = f"=MATCH(C4,Movies!$A$2:$A${LF},0)"
fc["C5"].font = f_body
F = Calc(fc, 7)
F.addr["fid"] = "$C$4"
F.addr["i"] = "$C$5"


def mvi(col):
    return f"INDEX(Movies!${col}$2:${col}$@LF@,{{i}})"


def mvb(col):
    return f'=IF({mvi(col)}="","",{mvi(col)})'


TIFR = "'Tolly Index Films'!${c}$2:${c}$@LF@"


def tif(col):
    return TIFR.replace("{c}", col)


CRIT = (f'{tif("J")},1,{tif("C")},">="&({{y}}-CohortYears),{tif("C")},"<="&({{y}}+CohortYears)')

F.section("1 · INPUTS — copied from the Movies sheet (blue cells there)")
F.step("title", "IN1", "Title", f"={mvi('B')}", "Movies column B")
F.step("y", "IN2", "Release year y", f"={mvi('C')}", "Movies column C (the hero's filmography)", fmt="0")
F.step("heroes", "IN3", "Lead hero(s)", f"={mvi('D')}", "Movies column D")
F.step("tel", "IN4", "Original language Telugu?", mvb("G"), "Movies column G")
F.step("imdb", "IN5", "IMDb ID", mvb("I"), "Movies column I")
F.step("R", "IN6", "IMDb rating R (out of 10)", mvb("K"), "Movies column K", fmt="0.0")
F.step("v", "IN7", "IMDb votes v", mvb("L"), "Movies column L", fmt="#,##0")
F.step("wy", "IN8", "Release year on Wikidata", mvb("M"), "Movies column M", fmt="0")
F.step("iy", "IN9", "Release year on IMDb", mvb("N"), "Movies column N", fmt="0")
F.step("e", "IN10", "Wikipedia language editions e", mvb("R"), "Movies column R", fmt="0")
F.step("en", "IN11", "English page views (60 days)", mvb("S"), "Movies column S", fmt="#,##0")
F.step("te", "IN12", "Telugu page views (60 days)", mvb("T"), "Movies column T", fmt="#,##0")
F.step("dt", "IN13", "Exact release date", mvb("E"), "Movies column E (needed only near the 2-year cut-off)", fmt="yyyy-mm-dd")

F.section("2 · THE GATE — a film is scored only if every check passes (we never guess a missing number)")
F.step("g0", "G0", "Original language is Telugu", '=IF({tel}="No","Excluded",IF({tel}="","Fail","Pass"))',
       "Telugu = Yes, else the film is excluded from the hero's record", '=IF({tel}="","not known","Language: "&IF({tel}="Yes","Telugu","not Telugu"))')
F.step("g1", "G1", "IMDb title found", '=IF({imdb}<>"","Pass","Fail")', "IMDb ID is not blank", '=IF({imdb}<>"","IMDb id "&{imdb},"no IMDb title linked")')
F.step("g2", "G2", "Rating has enough votes", '=IF({imdb}="","Fail",IF(OR({R}="",N({v})<MinVotes),"Fail","Pass"))',
       "v ≥ 10 (MinVotes)", '=TEXT(N({v}),"#,##0")&" votes; the minimum is "&MinVotes')
F.step("g3", "G3", "Release year confirmed by a 2nd source", '=IF(OR(AND({wy}<>"",ABS(N({wy})-{y})<=1),AND({iy}<>"",ABS(N({iy})-{y})<=1)),"Pass","Fail")',
       "|Wikidata year − y| ≤ 1  OR  |IMDb year − y| ≤ 1", '="Filmography "&{y}&" · Wikidata "&IF({wy}="","none",{wy})&" · IMDb "&IF({iy}="","none",{iy})')
F.step("g4", "G4", "Language editions known", '=IF({e}<>"","Pass","Fail")', "e is not blank (0 = no article, which is a known value)",
       '=IF({e}="","not known",{e}&" Wikipedia language editions")')
F.step("g5", "G5", "Page views known", '=IF(AND({en}<>"",{te}<>""),"Pass","Fail")', "English and Telugu views not blank (0 = no article)",
       '=TEXT(N({en}),"#,##0")&" English + "&TEXT(N({te}),"#,##0")&" Telugu readers in 60 days"')
F.step("age", "G6a", "Age in months (if exact date known)", '=IF({dt}="","",' + months("{dt}") + ")", "whole months from the release date to the as-of date",
       '=IF({dt}="","no exact date: judged from the year","released "&TEXT({dt},"d mmm yyyy")&", as of "&TEXT(AsOf,"d mmm yyyy"))', fmt="0")
F.step("g6", "G6", "Old enough to judge? (24 months)",
       '=IF({dt}<>"",IF({age}>=MinAge,"Old","Young"),IF(' + months("DATE({y},12,31)") + '>=MinAge,"Old",IF(' + months("DATE({y},1,1)") + '<MinAge,"Young","Unknown")))',
       "Old if age ≥ 24 months · Young (provisional) if fewer · Unknown if the year alone can't tell and no date",
       '=IF({g6}="Old","at least "&MinAge&" months old",IF({g6}="Young","under "&MinAge&" months: provisional","needs the exact release date"))')
F.step("fails", "G7", "Checks failed", '=COUNTIF({g0}:{g5},"Fail")+IF(AND({g6}="Unknown",{tel}<>"No"),1,0)',
       "count of Fail in G0–G5, plus 1 if the age is Unknown", fmt="0")
F.step("status", "G8", "STATUS", '=IF({tel}="No","Excluded",IF({g6}="Young","Provisional",IF({fails}=0,"Complete","Incomplete")))',
       "Excluded (not Telugu) → Provisional (Young) → Complete (0 fails) → Incomplete",
       '=IF({status}="Incomplete","missing: "&INDEX(' + tif("H") + ',{i}),IF({status}="Provisional","scored for display, not yet counted for the hero",""))', result=True)
F.step("ok", "G9", "Scored? (in the era cohorts)", '=IF(OR({status}="Complete",AND({status}="Provisional",{fails}=0)),"Yes","No")',
       "Yes if Complete, or Provisional with nothing missing")
F.step("chk1", "G10", "Same status on 'Tolly Index Films'", "=INDEX(" + tif("I") + ",{i})", "check", '=IF({chk1}={status},"✓ matches","✗ differs")')


def guard(expr):
    return '=IF({ok}="Yes",' + expr + ',"—")'


def gtext(expr):
    return '=IF({ok}="Yes",' + expr + ',"")'


F.section("3 · ERA COHORT — the film is only compared with scored films released within a year of it")
F.step("yrs", "C1", "Cohort years", '=({y}-CohortYears)&" – "&({y}+CohortYears)', "[y − 1, y + 1]")
F.step("n", "C2", "Films in the cohort n", "=COUNTIFS(" + CRIT + ")", "n = number of scored films in those years", '="scored films released "&{yrs}', fmt="#,##0")
F.step("m", "C3", "Median IMDb votes m", "=MEDIAN(IF((" + tif("J") + "=1)*(" + tif("C") + ">={y}-CohortYears)*(" + tif("C") + "<={y}+CohortYears)," + tif("K") + "))",
       "m = median of v over the cohort (array formula)", '="the typical film of "&{yrs}&" has "&TEXT({m},"#,##0")&" IMDb votes"', fmt="#,##0.0", array=True)
F.step("Cm", "C4", "Mean IMDb rating C", "=AVERAGEIFS(" + tif("L") + "," + CRIT + ")", "C = average of R over the cohort",
       '="average rating of the "&{n}&" films: "&TEXT({Cm},"0.000")', fmt="0.000")

F.section("4 · RATING pillar (50%) — did people like it?",
          "A rating from a few voters is unreliable, so it is pulled toward the era average C. The more votes, the less it moves.")
F.step("w", "R1", "Weight on the film's own rating", guard("{v}/({v}+{m})"), "w = v ÷ (v + m)",
       gtext('TEXT({v},"#,##0")&" ÷ ("&TEXT({v},"#,##0")&" + "&TEXT({m},"#,##0.0")&") = "&TEXT({w},"0.000")'), fmt="0.000")
F.step("Rp", "R2", "Shrunk rating R′", guard("{w}*{R}+(1-{w})*{Cm}"), "R′ = w × R + (1 − w) × C",
       gtext('TEXT({w},"0.000")&" × "&TEXT({R},"0.0")&" + "&TEXT(1-{w},"0.000")&" × "&TEXT({Cm},"0.000")&" = "&TEXT({Rp},"0.000")'), fmt="0.000")
F.step("rating", "R3", "RATING (0–100)", guard("ROUND(({Rp}-1)/9*100,1)"), "Rating = ROUND((R′ − 1) ÷ 9 × 100, 1)",
       gtext('"("&TEXT({Rp},"0.000")&" − 1) ÷ 9 × 100 = "&TEXT({rating},"0.0")'), fmt="0.0", result=True)

F.section("5 · REACH pillar (30%) — how many people cared, compared with films of the same years",
          "Percentile = share of cohort films below this one; tied films count half; the film is not compared with itself.")
F.step("vb", "P1", "Cohort films with fewer votes", guard("COUNTIFS(" + CRIT + "," + tif("K") + ',"<"&{v})'), "below = count of cohort films with v′ < v", fmt="0")
F.step("ve", "P2", "Cohort films with the same votes (incl. this film)", guard("COUNTIFS(" + CRIT + "," + tif("K") + ",{v})"), "tied = count with v′ = v", fmt="0")
F.step("pv", "P3", "Votes percentile", guard("IF({n}<=1,50,({vb}+({ve}-1)/2)/({n}-1)*100)"), "pct = (below + (tied − 1) ÷ 2) ÷ (n − 1) × 100",
       gtext('"("&{vb}&" + ("&{ve}&" − 1) ÷ 2) ÷ ("&{n}&" − 1) × 100 = "&TEXT({pv},"0.0")'), fmt="0.0")
F.step("eb", "P4", "Cohort films in fewer languages", guard("COUNTIFS(" + CRIT + "," + tif("M") + ',"<"&{e})'), "below, on e", fmt="0")
F.step("ee", "P5", "Cohort films in the same number (incl. this film)", guard("COUNTIFS(" + CRIT + "," + tif("M") + ",{e})"), "tied, on e", fmt="0")
F.step("pe", "P6", "Editions percentile", guard("IF({n}<=1,50,({eb}+({ee}-1)/2)/({n}-1)*100)"), "same percentile formula on e",
       gtext('"("&{eb}&" + ("&{ee}&" − 1) ÷ 2) ÷ ("&{n}&" − 1) × 100 = "&TEXT({pe},"0.0")'), fmt="0.0")
F.step("reach", "P7", "REACH (0–100)", guard("ROUND(Reach_Votes*{pv}+Reach_Editions*{pe},1)"), "Reach = ROUND(⅔ × votes pct + ⅓ × editions pct, 1)",
       gtext('TEXT(Reach_Votes,"0.000")&" × "&TEXT({pv},"0.0")&" + "&TEXT(Reach_Editions,"0.000")&" × "&TEXT({pe},"0.0")&" = "&TEXT({reach},"0.0")'), fmt="0.0", result=True)

F.section("6 · STAY pillar (20%) — do people still care today?")
F.step("views", "S1", "Page views, English + Telugu (60 days)", guard("{en}+{te}"), "views = English views + Telugu views",
       gtext('TEXT({en},"#,##0")&" + "&TEXT({te},"#,##0")&" = "&TEXT({views},"#,##0")'), fmt="#,##0")
F.step("sb", "S2", "Cohort films with fewer views", guard("COUNTIFS(" + CRIT + "," + tif("D") + ',"<"&{views})'), "below, on views", fmt="0")
F.step("se", "S3", "Cohort films with the same views (incl. this film)", guard("COUNTIFS(" + CRIT + "," + tif("D") + ",{views})"), "tied, on views", fmt="0")
F.step("stay", "S4", "STAY (0–100)", guard("ROUND(IF({n}<=1,50,({sb}+({se}-1)/2)/({n}-1)*100),1)"), "Stay = ROUND(views percentile, 1)",
       gtext('"("&{sb}&" + ("&{se}&" − 1) ÷ 2) ÷ ("&{n}&" − 1) × 100 = "&TEXT({stay},"0.0")'), fmt="0.0", result=True)

F.section("7 · RAW SCORE and CONFIDENCE")
F.step("raw", "T1", "Raw score", guard("ROUND(W_Rating*{rating}+W_Reach*{reach}+W_Stay*{stay},1)"), "raw = ROUND(0.5 × Rating + 0.3 × Reach + 0.2 × Stay, 1)",
       gtext('TEXT(W_Rating,"0.00")&" × "&TEXT({rating},"0.0")&" + "&TEXT(W_Reach,"0.00")&" × "&TEXT({reach},"0.0")&" + "&TEXT(W_Stay,"0.00")&" × "&TEXT({stay},"0.0")&" = "&TEXT({raw},"0.0")'), fmt="0.0")
F.step("c", "T2", "Confidence c", guard("ROUND(MIN(1,LOG10(1+{v})/LOG10(FullConf)),3)"), "c = ROUND(MIN(1, log10(1 + v) ÷ log10(1000)), 3)",
       gtext('"log10(1 + "&TEXT({v},"#,##0")&") ÷ log10("&TEXT(FullConf,"#,##0")&") = "&TEXT(LOG10(1+{v})/LOG10(FullConf),"0.000")&IF(LOG10(1+{v})/LOG10(FullConf)>1," → capped at 1","")'), fmt="0.000")
F.step("mr", "T3", "Cohort mean raw score", "=AVERAGEIFS(" + tif("W") + "," + CRIT + ")", "average raw score of the cohort",
       '="where a film of "&{yrs}&" with no evidence would land"', fmt="0.00")

F.section("8 · TOLLY INDEX — the film's own score, trusted in proportion to its evidence")
F.step("ti", "TI", "FILM TOLLY INDEX (0–100)", '=IF({ok}="Yes",ROUND({c}*{raw}+(1-{c})*{mr},1),"Not scored")', "TI = ROUND(c × raw + (1 − c) × cohort mean raw, 1)",
       '=IF({ok}="Yes",TEXT({c},"0.000")&" × "&TEXT({raw},"0.0")&" + "&TEXT(1-{c},"0.000")&" × "&TEXT({mr},"0.00")&" = "&TEXT({ti},"0.0"),"not scored: "&IF({status}="Excluded","not a Telugu film","missing "&INDEX(' + tif("H") + ',{i})))',
       fmt="0.0", result=True)
F.step("chk2", "CHK", "Same value on 'Tolly Index Films' (column Z)", "=INDEX(" + tif("Z") + ",{i})", "check",
       '=IF(AND(ISNUMBER({ti}),ISNUMBER({chk2})),IF({ti}={chk2},"✓ matches","✗ differs"),IF({chk2}="","✓ also not scored",""))', fmt="0.0")
F.step("app", "APP", "Value computed by the app", "=INDEX(" + tif("AA") + ",{i})", "check (lib/data/tolly/films.json)",
       '=IF(ISNUMBER({app}),IF({app}={chk2},"✓ matches","✗ differs"),"")', fmt="0.0")
FC_TI = F.addr["ti"].replace("$", "")
for s, fl in (("Pass", fill_green), ("Fail", fill_red), ("Excluded", fill_grey)):
    fc.conditional_formatting.add(f"C{int(F.addr['g0'].split('$')[-1])}:C{int(F.addr['g6'].split('$')[-1])}", CellIsRule(operator="equal", formula=[f'"{s}"'], fill=fl))

# ───────────────────────────── Hero Calculator ─────────────────────────────
calc_head(hcalc, "Hero Calculator: one hero's Tolly Index, step by step",
          "Pick any hero in C4. Every value is recalculated live from his films; the table at the bottom lists each film and what it adds.")
hcalc["B4"] = "Hero (pick from the list) ▸"
hcalc["B4"].font = f_bold
hcalc["C4"] = EX_HERO
hcalc["C4"].font = f_input_big
hcalc["C4"].fill = fill_light_yellow
hcalc["C4"].border = box
hcalc.merge_cells("C4:D4")
dvh = DataValidation(type="list", formula1=f"Heroes!$B$2:$B${LH}", allow_blank=False)
hcalc.add_data_validation(dvh)
dvh.add("C4")
hcalc["B5"] = "Hero ID"
hcalc["C5"] = f"=INDEX(Heroes!$A$2:$A${LH},MATCH(C4,Heroes!$B$2:$B${LH},0))"
hcalc["B6"] = "Position in the hero list"
hcalc["C6"] = f"=MATCH(C4,Heroes!$B$2:$B${LH},0)"
for c in ("B5", "C5", "B6", "C6"):
    hcalc[c].font = f_body
Hc = Calc(hcalc, 7)
Hc.addr["slug"] = "$C$5"
Hc.addr["hi"] = "$C$6"
CRA = "Credits!$A$2:$A$@LC@"
CRF = "Credits!$F$2:$F$@LC@"


def crs(col):
    return f"Credits!${col}$2:${col}$@LC@"


Hc.section("1 · HIS FILMS — every Telugu film since 2000 where he is a lead (Credits sheet)")
Hc.step("lead", "H1", "Lead films", f"=COUNTIFS({CRA},{{slug}})", "count of his rows on Credits", fmt="0")
Hc.step("excl", "H2", "Not Telugu (excluded)", f'=COUNTIFS({CRA},{{slug}},{CRF},"Excluded")', "Status = Excluded", fmt="0")
Hc.step("prov", "H3", "Under 2 years old (provisional, not counted yet)", f'=COUNTIFS({CRA},{{slug}},{CRF},"Provisional")', "Status = Provisional", fmt="0")
Hc.step("comp", "H4", "Complete films (every input present)", f'=COUNTIFS({CRA},{{slug}},{CRF},"Complete")', "Status = Complete", fmt="0")
Hc.step("inc", "H4b", "Incomplete films (an input is missing)", f'=COUNTIFS({CRA},{{slug}},{CRF},"Incomplete")', "Status = Incomplete", fmt="0")
Hc.step("judged", "H5", "Judged films", "={lead}-{excl}-{prov}", "judged = lead − excluded − provisional",
        '={lead}&" − "&{excl}&" − "&{prov}&" = "&{judged}', fmt="0")
Hc.step("share", "H6", "Share complete", '=IF({judged}>0,{comp}/{judged},"")', "share = complete ÷ judged",
        '={comp}&" ÷ "&{judged}&" = "&TEXT({share},"0.0%")', fmt="0.0%")

Hc.section("2 · CAN HE BE RANKED? — two rules, so no hero is ranked on a patchy record")
Hc.step("ruleA", "H7a", "At least 5 complete films", '=IF({comp}>=HeroMin,"Pass","Fail")', "complete ≥ 5 (HeroMin)", '={comp}&" complete; needs "&HeroMin')
Hc.step("ruleB", "H7b", "At least 90% of judged films complete", '=IF(N({share})>=HeroShare,"Pass","Fail")', "share ≥ 90% (HeroShare)",
        '=TEXT(N({share}),"0.0%")&"; needs "&TEXT(HeroShare,"0%")')
Hc.step("ranked", "H7", "RANKED?", '=IF(AND({lead}-{excl}>0,{ruleA}="Pass",{ruleB}="Pass"),"Yes","No")', "Yes only if both rules pass", result=True)

Hc.section("3 · HERO TOLLY INDEX — the evidence-weighted average of his complete films, plus 3 'average films'",
           "Each film counts in proportion to its confidence c. Adding k = 3 films at the all-film mean M stops a short career from topping a long, strong one.")
Hc.step("sc", "H8", "Σ c — total evidence", f'=SUMIFS({crs("G")},{CRA},{{slug}},{CRF},"Complete")', "Σ c over his complete films (= column E total below)", fmt="0.000")
Hc.step("sct", "H9", "Σ c × TI", f'=SUMIFS({crs("I")},{CRA},{{slug}},{CRF},"Complete")', "Σ (c × film TI) (= column F total below)", fmt="#,##0.00")
Hc.step("M", "H10", "M — mean TI of all complete films", "=AllMean", "Settings!AllMean", fmt="0.0000")
Hc.step("k", "H11", "k — 'average films' added", "=HeroPrior", "Settings!HeroPrior", fmt="0")
Hc.step("hti", "H12", "HERO TOLLY INDEX", '=IF({ranked}="Yes",ROUND(({sct}+{k}*{M})/({sc}+{k}),1),"Not ranked")', "Hero TI = ROUND((Σ c×TI + k × M) ÷ (Σ c + k), 1)",
        '=IF(ISNUMBER({hti}),"("&TEXT({sct},"#,##0.00")&" + "&{k}&" × "&TEXT({M},"0.00")&") ÷ ("&TEXT({sc},"0.00")&" + "&{k}&") = "&TEXT({hti},"0.0"),"")',
        fmt="0.0", result=True)
Hc.step("fame", "H12b", "Fame (0–100) from his followers", "=INDEX(" + TH + "!$AA$2:$AA$@LH@,{hi})", "Fame = (log10(followers) − 4) ÷ 4 × 100, between 0 and 100",
        '=IF(ISNUMBER({fame}),TEXT(INDEX(Heroes!$P$2:$P$@LH@,{hi}),"#,##0")&" followers → "&TEXT({fame},"0.0"),IF(FameOn,"no account: films alone","no recent follower count"))', fmt="0.0")
Hc.step("final", "H12c", "FINAL TOLLY INDEX", '=IF(ISNUMBER({hti}),IF(AND(FameOn,ISNUMBER({fame})),ROUND((1-W_Fame)*{hti}+W_Fame*{fame},1),{hti}),"Not ranked")',
        "Final = ROUND((1 − 0.15) × hero TI + 0.15 × Fame, 1) while fame is on",
        '=IF(ISNUMBER({final}),IF(AND(FameOn,ISNUMBER({fame})),TEXT(1-W_Fame,"0.00")&" × "&TEXT({hti},"0.0")&" + "&TEXT(W_Fame,"0.00")&" × "&TEXT({fame},"0.0")&" = "&TEXT({final},"0.0"),"fame is off until every ranked hero has a recent count: final = hero TI"),"")',
        fmt="0.0", result=True)
Hc.step("rank", "H13", "Rank", '=IF(ISNUMBER({final}),COUNTIF(' + TH + '!$AB$2:$AB$@LH@,">"&{final})+1,"")', "1 + number of heroes with a higher final index",
        '=IF(ISNUMBER({rank}),"#"&{rank}&" of "&COUNT(' + TH + '!$AB$2:$AB$@LH@)&" ranked heroes","")', fmt="0", result=True)

Hc.section("4 · HOW SURE ARE WE? — the ± band")
Hc.step("mean", "H14", "Plain average of his films' TI", f'=IF({{comp}}>0,SUMIFS({crs("H")},{CRA},{{slug}},{CRF},"Complete")/{{comp}},"")', "mean = Σ TI ÷ complete", fmt="0.00")
Hc.step("spread", "H15", "Spread (how much his films vary)", f'=IF({{comp}}>=2,SQRT(MAX(0,SUMIFS({crs("J")},{CRA},{{slug}},{CRF},"Complete")/{{comp}}-{{mean}}^2)),"")',
        "spread = √(mean of TI² − mean²)  (population SD)", fmt="0.00")
Hc.step("band", "H16", "± band (95%)", '=IF(AND({ranked}="Yes",{spread}<>""),ROUND(1.96*{spread}/SQRT({sc}+{k}),1),"")', "band = ROUND(1.96 × spread ÷ √(Σ c + k), 1)",
        '=IF(ISNUMBER({band}),"1.96 × "&TEXT({spread},"0.00")&" ÷ √("&TEXT({sc},"0.00")&" + "&{k}&") = "&TEXT({band},"0.0"),"")', fmt="0.0", result=True)
Hc.step("fband", "H16b", "Final ± band", '=IF(ISNUMBER({band}),IF(AND(FameOn,ISNUMBER({fame})),ROUND({band}*(1-W_Fame),1),{band}),"")', "band × (1 − 0.15) while fame is on", fmt="0.0")
Hc.step("range", "H17", "Range", '=IF(ISNUMBER({fband}),TEXT({final}-{fband},"0.0")&" to "&TEXT({final}+{fband},"0.0"),"")', "final − band  to  final + band",
        '=IF(ISNUMBER({band}),"heroes whose ranges overlap are about level","")')

Hc.section("5 · WHAT KIND OF HERO — pillar profile (confidence-weighted)")
Hc.step("pr", "H18", "Rating profile", f'=IF({{sc}}>0,ROUND(SUMIFS({crs("K")},{CRA},{{slug}},{CRF},"Complete")/{{sc}},1),"")', "Σ (c × Rating) ÷ Σ c", fmt="0.0")
Hc.step("pc", "H19", "Reach profile", f'=IF({{sc}}>0,ROUND(SUMIFS({crs("L")},{CRA},{{slug}},{CRF},"Complete")/{{sc}},1),"")', "Σ (c × Reach) ÷ Σ c", fmt="0.0")
Hc.step("ps", "H20", "Stay profile", f'=IF({{sc}}>0,ROUND(SUMIFS({crs("M")},{CRA},{{slug}},{CRF},"Complete")/{{sc}},1),"")', "Σ (c × Stay) ÷ Σ c", fmt="0.0")
Hc.step("chk", "CHK", "Same value on 'Tolly Index Heroes' (column O)", "=INDEX(" + TH + "!$O$2:$O$@LH@,{hi})", "check",
        '=IF(AND(ISNUMBER({hti}),ISNUMBER({chk})),IF({hti}={chk},"✓ matches","✗ differs"),IF({chk}="","✓ also not ranked",""))', fmt="0.0")
Hc.step("chkf", "CHK", "Same final value on 'Tolly Index Heroes' (column AB)", "=INDEX(" + TH + "!$AB$2:$AB$@LH@,{hi})", "check",
        '=IF(AND(ISNUMBER({final}),ISNUMBER({chkf})),IF({final}={chkf},"✓ matches","✗ differs"),IF({chkf}="","✓ also not ranked",""))', fmt="0.0")
Hc.step("happ", "APP", "Value computed by the app", "=INDEX(" + TH + "!$W$2:$W$@LH@,{hi})", "check (lib/data/tolly/heroes.json)",
        '=IF(ISNUMBER({happ}),IF({happ}={chkf},"✓ matches","✗ differs"),"")', fmt="0.0")
for s, fl in (("Pass", fill_green), ("Fail", fill_red), ("Yes", fill_green), ("No", fill_red)):
    hcalc.conditional_formatting.add(f"C{int(Hc.addr['ruleA'].split('$')[-1])}:C{int(Hc.addr['ranked'].split('$')[-1])}", CellIsRule(operator="equal", formula=[f'"{s}"'], fill=fl))

# Film table: every lead film of the chosen hero, with what it adds.
r0 = Hc.r + 1
for col in "ABCDEF":
    hcalc[f"{col}{r0}"].fill = fill_navy
hcalc[f"A{r0}"] = "6 · HIS FILMS ONE BY ONE — only Complete films count; the totals equal H8 and H9 above"
hcalc[f"A{r0}"].font = f_sec
r0 += 1
hcalc[f"B{r0}"] = "First row of his films on Credits"
hcalc[f"B{r0}"].font = f_small
hcalc[f"C{r0}"] = f"=MATCH({Hc.addr['slug']},Credits!$A$2:$A${LC},0)"
hcalc[f"C{r0}"].font = f_small
FIRST = f"$C${r0}"
r0 += 1
for i, h in enumerate(["#", "Film (year)", "Film TI", "Status / what is missing", "Confidence c", "c × TI"], start=1):
    c = hcalc.cell(row=r0, column=i, value=h)
    c.font = f_head
    c.fill = fill_calc
    c.alignment = center
LEAD = Hc.addr["lead"]
MAXF = 65
for k in range(1, MAXF + 1):
    rr = r0 + k
    ix = f"{FIRST}+{k}-1"
    hcalc[f"A{rr}"] = f'=IF({k}<={LEAD},{k},"")'
    hcalc[f"B{rr}"] = f'=IF({k}<={LEAD},INDEX(Credits!$D$2:$D${LC},{ix})&" ("&INDEX(Credits!$E$2:$E${LC},{ix})&")","")'
    hcalc[f"C{rr}"] = f'=IF({k}<={LEAD},INDEX(Credits!$H$2:$H${LC},{ix}),"")'
    hcalc[f"D{rr}"] = (f'=IF({k}<={LEAD},INDEX(Credits!$F$2:$F${LC},{ix})&IF(INDEX(Credits!$F$2:$F${LC},{ix})="Incomplete",'
                       f'" — missing: "&INDEX({T}!$H$2:$H${LF},INDEX(Credits!$N$2:$N${LC},{ix})),""),"")')
    hcalc[f"E{rr}"] = f'=IF({k}<={LEAD},INDEX(Credits!$G$2:$G${LC},{ix}),"")'
    hcalc[f"F{rr}"] = f'=IF({k}<={LEAD},INDEX(Credits!$I$2:$I${LC},{ix}),"")'
    for col in "ABCDEF":
        hcalc[f"{col}{rr}"].font = f_body
        hcalc[f"{col}{rr}"].border = Border(bottom=Side(style="hair", color="D9D9D9"))
    hcalc[f"C{rr}"].number_format = "0.0"
    hcalc[f"E{rr}"].number_format = "0.000"
    hcalc[f"F{rr}"].number_format = "0.00"
    hcalc[f"F{rr}"].alignment = Alignment(horizontal="left")
    hcalc[f"D{rr}"].alignment = Alignment(wrap_text=False)
rt = r0 + MAXF + 1
hcalc[f"B{rt}"] = "Totals over Complete films"
hcalc[f"E{rt}"] = f"=SUM(E{r0 + 1}:E{rt - 1})"
hcalc[f"F{rt}"] = f"=SUM(F{r0 + 1}:F{rt - 1})"
hcalc[f"D{rt}"] = f'="Σ c and Σ c × TI → same as H8 = "&TEXT({Hc.addr["sc"]},"0.000")&" and H9 = "&TEXT({Hc.addr["sct"]},"#,##0.00")'
for col in "BDEF":
    hcalc[f"{col}{rt}"].font = f_bold
    hcalc[f"{col}{rt}"].fill = fill_amber
hcalc[f"E{rt}"].number_format = "0.000"
hcalc[f"F{rt}"].number_format = "#,##0.00"
hcalc[f"F{rt}"].alignment = Alignment(horizontal="left")
hcalc.conditional_formatting.add(f"D{r0 + 1}:D{rt - 1}", FormulaRule(formula=[f'LEFT(D{r0 + 1},8)="Complete"'], fill=fill_green))
hcalc.conditional_formatting.add(f"D{r0 + 1}:D{rt - 1}", FormulaRule(formula=[f'LEFT(D{r0 + 1},10)="Incomplete"'], fill=PatternFill("solid", fgColor="FFEB9C")))
assert max(sum(1 for p in pairs if p[0] == h["slug"]) for h in heroes) <= MAXF

# ───────────────────────────── Dashboard ─────────────────────────────
db.sheet_view.showGridLines = False
db["A1"] = "Tolly Index — dashboard"
db["A1"].font = f_title
db["A2"] = f"Everything here is live: it reads the calculation sheets. Data as of {AS_OF_TEXT} · method {VERSION}."
db["A2"].font = f_sub
tiles = [
    ("FILMS", f"=COUNTA(Movies!$A$2:$A${LF})"),
    ("COMPLETE", f'=COUNTIF({T}!$I$2:$I${LF},"Complete")'),
    ("PROVISIONAL (<2 yrs)", f'=COUNTIF({T}!$I$2:$I${LF},"Provisional")'),
    ("INCOMPLETE", f'=COUNTIF({T}!$I$2:$I${LF},"Incomplete")'),
    ("NOT TELUGU", f'=COUNTIF({T}!$I$2:$I${LF},"Excluded")'),
    ("HEROES", f"=COUNTA(Heroes!$A$2:$A${LH})"),
    ("RANKED", f"=COUNT({TH}!$O$2:$O${LH})"),
    ("NOT RANKED YET", f'=COUNTIF({TH}!$M$2:$M${LH},"No")'),
    ("AVERAGE FILM (M)", "=AllMean"),
]
tile_cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I"]
for (lbl, fml), col in zip(tiles, tile_cols):
    db[f"{col}4"] = lbl
    db[f"{col}4"].font = f_tile_lbl
    db[f"{col}4"].fill = fill_cream
    db[f"{col}4"].alignment = center
    db[f"{col}5"] = fml
    db[f"{col}5"].font = f_tile_val
    db[f"{col}5"].fill = fill_cream
    db[f"{col}5"].alignment = center
    db[f"{col}5"].number_format = "#,##0" if lbl != "AVERAGE FILM (M)" else "0.0"
    db[f"{col}4"].border = Border(top=Side(style="thick", color=AMBER), left=thin, right=thin)
    db[f"{col}5"].border = Border(bottom=thin, left=thin, right=thin)
db.row_dimensions[4].height = 26
db.row_dimensions[5].height = 34

db["A7"] = "Hero ranking (best first)"
db["A7"].font = f_h2
rk_cols = [("Rank", "Q"), ("Hero", "B"), ("Tolly Index", "AB"), ("± band", "AC"), ("Low", None), ("High", None), ("Complete films", "F"),
           ("Judged films", "G"), ("Share complete", "H"), ("Rating", "R"), ("Reach", "S"), ("Stay", "T"), ("Best film", "V"), ("row", None)]
for i, (h, _) in enumerate(rk_cols, start=1):
    c = db.cell(row=8, column=i, value=h)
    c.font = f_head
    c.fill = fill_navy
    c.alignment = center
db.row_dimensions[8].height = 30
for k in range(1, NH + 1):
    rr = 8 + k
    db[f"N{rr}"] = f'=IF({k}<=COUNT({TH}!$Y$2:$Y${LH}),MATCH(LARGE({TH}!$Y$2:$Y${LH},{k}),{TH}!$Y$2:$Y${LH},0),"")'
    db[f"N{rr}"].font = f_ref
    for i, (h, src) in enumerate(rk_cols, start=1):
        col = get_column_letter(i)
        if src:
            db[f"{col}{rr}"] = f'=IF($N{rr}="","",INDEX({TH}!${src}$2:${src}${LH},$N{rr}))'
        if col != "N":
            db[f"{col}{rr}"].font = f_bold if col in "BC" else f_body
    db[f"E{rr}"] = f'=IF($N{rr}="","",C{rr}-D{rr})'
    db[f"F{rr}"] = f'=IF($N{rr}="","",C{rr}+D{rr})'
    db[f"E{rr}"].font = f_body
    db[f"F{rr}"].font = f_body
    for col in "CDEFJKL":
        db[f"{col}{rr}"].number_format = "0.0"
    db[f"I{rr}"].number_format = "0%"
    if k % 2 == 0:
        for i in range(1, 14):
            db.cell(row=rr, column=i).fill = PatternFill("solid", fgColor="F7F3EA")
RK_LAST = 8 + NH
for rr in range(9, RK_LAST + 1):
    db[f"A{rr}"].alignment = Alignment(horizontal="center")
db.conditional_formatting.add(f"C9:C{RK_LAST}", DataBarRule(start_type="num", start_value=40, end_type="num", end_value=80, color="E9A23B"))

db["P7"] = "Top 25 films (Complete only)"
db["P7"].font = f_h2
tf_cols = [("#", None), ("Film", "B"), ("Year", "C"), ("Lead hero(s)", None), ("Tolly Index", "Z"), ("Rating", "R"), ("Reach", "U"), ("Stay", "V"), ("row", None)]
for i, (h, _) in enumerate(tf_cols, start=16):
    c = db.cell(row=8, column=i, value=h)
    c.font = f_head
    c.fill = fill_navy
    c.alignment = center
for k in range(1, 26):
    rr = 8 + k
    db[f"X{rr}"] = f'=IF({k}<=COUNT({T}!$AC$2:$AC${LF}),MATCH(LARGE({T}!$AC$2:$AC${LF},{k}),{T}!$AC$2:$AC${LF},0),"")'
    db[f"X{rr}"].font = f_ref
    db[f"P{rr}"] = k
    for i, (h, src) in enumerate(tf_cols, start=16):
        col = get_column_letter(i)
        if src:
            db[f"{col}{rr}"] = f'=IF($X{rr}="","",INDEX({T}!${src}$2:${src}${LF},$X{rr}))'
        if col != "X":
            db[f"{col}{rr}"].font = f_bold if col in "QT" else f_body
    db[f"S{rr}"] = f'=IF($X{rr}="","",INDEX(Movies!$D$2:$D${LF},$X{rr}))'
    db[f"S{rr}"].font = f_body
    for col in "TUVW":
        db[f"{col}{rr}"].number_format = "0.0"
db.conditional_formatting.add("T9:T33", DataBarRule(start_type="num", start_value=50, end_type="num", end_value=100, color="E9A23B"))

db["P36"] = "Heroes not ranked yet, and why"
db["P36"].font = f_h2
for i, h in enumerate(["#", "Hero", "Complete", "Judged", "Why not ranked"], start=16):
    c = db.cell(row=37, column=i, value=h)
    c.font = f_head
    c.fill = fill_navy
    c.alignment = center
db.cell(row=37, column=24, value="row").font = f_head
db.cell(row=37, column=24).fill = fill_navy
for k in range(1, NH + 1):
    rr = 37 + k
    db[f"X{rr}"] = f'=IFERROR(MATCH({k},{TH}!$Z$2:$Z${LH},0),"")'
    db[f"X{rr}"].font = f_ref
    db[f"P{rr}"] = f'=IF($X{rr}="","",{k})'
    db[f"Q{rr}"] = f'=IF($X{rr}="","",INDEX({TH}!$B$2:$B${LH},$X{rr}))'
    db[f"R{rr}"] = f'=IF($X{rr}="","",INDEX({TH}!$F$2:$F${LH},$X{rr}))'
    db[f"S{rr}"] = f'=IF($X{rr}="","",INDEX({TH}!$G$2:$G${LH},$X{rr}))'
    db[f"T{rr}"] = f'=IF($X{rr}="","",INDEX({TH}!$N$2:$N${LH},$X{rr}))'
    for col in "PQRST":
        db[f"{col}{rr}"].font = f_body
db.row_dimensions[36].height = 20
db.row_dimensions[37].height = 20
widths(db, [11, 22, 11, 9, 8, 8, 10, 9, 11, 8, 8, 8, 26, 5, 3, 5, 26, 7, 24, 10, 8, 8, 8, 5])
db.freeze_panes = "A9"

chart = BarChart()
chart.type = "bar"
chart.style = 10
chart.title = "Top 20 heroes by Tolly Index"
chart.y_axis.title = "Tolly Index"
chart.y_axis.scaling.min = 40
chart.y_axis.scaling.max = 80
chart.x_axis.scaling.orientation = "maxMin"
chart.legend = None
chart.add_data(Reference(db, min_col=3, min_row=8, max_row=28), titles_from_data=True)
chart.set_categories(Reference(db, min_col=2, min_row=9, max_row=28))
chart.series[0].graphicalProperties.solidFill = AMBER
chart.height = 12
chart.width = 18
db.add_chart(chart, "Z8")

# ───────────────────────────── Formulas (formula book) ─────────────────────────────
fb.sheet_view.showGridLines = False
fb["A1"] = "Formula book: every formula of the Tolly Index"
fb["A1"].font = f_title
fb["A2"] = (f"Part A is the whole method on one screen. Part B lists every calculation column with its maths, its plain meaning and the exact Excel formula, "
            f"shown live for the example film {EX_FILM} (row {KR}) and the example hero {EX_HERO} (row {HR}).")
fb["A2"].font = f_sub
widths(fb, [7, 9, 30, 56, 52, 100, 20, 12])
fb["A4"] = "PART A — the method in eleven equations"
fb["A4"].font = f_h2
eqs = [
    ("1", "Shrunk rating", "R′ = v/(v+m) × R + m/(v+m) × C", "v = film's IMDb votes, R = its rating, m = median votes and C = mean rating of films within ±1 year. Few votes → close to C."),
    ("2", "RATING pillar", "Rating = (R′ − 1) ÷ 9 × 100", "Turns IMDb's 1–10 into 0–100."),
    ("3", "Percentile", "pct = (below + ½ × tied) ÷ (n − 1) × 100", "Against the n scored films of the same years, not counting the film itself. 50 if it is alone."),
    ("4", "REACH pillar", "Reach = ⅔ × pct(votes) + ⅓ × pct(language editions)", "How many people cared, for its time."),
    ("5", "STAY pillar", "Stay = pct(English + Telugu Wikipedia readers, last 60 days)", "Do people still care today, for its time."),
    ("6", "Raw score", "raw = 0.5 × Rating + 0.3 × Reach + 0.2 × Stay", "With Voice later: 0.35 / 0.30 / 0.20 / 0.15."),
    ("7", "Confidence", "c = min(1, log10(1 + v) ÷ log10(1000))", "10 votes → 0.35 · 100 → 0.67 · 1,000+ → 1."),
    ("8", "FILM TOLLY INDEX", "TI = c × raw + (1 − c) × cohort mean raw", "Little evidence → the film is pulled to its era's typical film."),
    ("9", "HERO TOLLY INDEX", "Hero TI = (Σ c × TI + 3 × M) ÷ (Σ c + 3)", "Over his complete films; M = mean TI of all complete films. Ranked only with ≥ 5 complete films and ≥ 90% of judged films complete."),
    ("10", "± band", "band = 1.96 × spread ÷ √(Σ c + 3)", "spread = standard deviation of his films' TI. Overlapping ranges = about level."),
    ("11", "Fame and final index", "Final = 0.85 × Hero TI + 0.15 × Fame;  Fame = (log10 followers − 4) ÷ 4 × 100", "Fame switches on only when every ranked hero has a follower count less than a year old (or has no account at all)."),
]
for c, h in zip("ACDE", ["#", "Name", "Equation", "What it means"]):
    fb[f"{c}5"] = h
    fb[f"{c}5"].font = f_head
    fb[f"{c}5"].fill = fill_navy
fb["B5"].fill = fill_navy
r = 6
for n, nm, eq, words in eqs:
    fb[f"A{r}"] = n
    fb[f"C{r}"] = nm
    fb[f"D{r}"] = eq
    fb[f"E{r}"] = words
    fb[f"A{r}"].font = f_bold
    fb[f"C{r}"].font = f_bold
    fb[f"D{r}"].font = f_eq
    fb[f"E{r}"].font = f_body
    for col in "ACDE":
        fb[f"{col}{r}"].alignment = Alignment(vertical="center", wrap_text=True)
        fb[f"{col}{r}"].fill = fill_cream
        fb[f"{col}{r}"].border = Border(bottom=thin)
    fb[f"B{r}"].fill = fill_cream
    fb[f"B{r}"].border = Border(bottom=thin)
    fb.row_dimensions[r].height = 30
    r += 1
r += 1
fb[f"A{r}"] = "The gate — six checks before a film is scored (all must pass)"
fb[f"A{r}"].font = f_h2
r += 1
gates = [
    ("1", "IMDb title found", "The film is linked to its IMDb title (via Wikidata, the hero's IMDb cast list, or a unique title + year match)."),
    ("2", "Enough votes", "At least 10 IMDb votes."),
    ("3", "Year confirmed", "Wikidata or IMDb agrees with the filmography year within 1 year."),
    ("4", "Language editions known", "Number of Wikipedia languages with an article (0 if none)."),
    ("5", "Page views known", "English + Telugu Wikipedia readers in the last 60 days (0 if no article)."),
    ("6", "Old enough", "At least 24 months since release; the exact date is needed only when the year alone can't tell."),
]
for n, nm, words in gates:
    fb[f"A{r}"] = n
    fb[f"C{r}"] = nm
    fb[f"D{r}"] = words
    fb[f"A{r}"].font = f_bold
    fb[f"C{r}"].font = f_bold
    fb[f"D{r}"].font = f_body
    fb.merge_cells(f"D{r}:E{r}")
    r += 1
fb[f"C{r}"] = "Status"
fb[f"C{r}"].font = f_bold
fb[f"D{r}"] = "Excluded = not a Telugu film · Provisional = under 2 years old · Incomplete = a check failed · Complete = every check passed. Only Complete films count for heroes."
fb[f"D{r}"].font = f_body
fb.merge_cells(f"D{r}:E{r}")
r += 2
fb[f"A{r}"] = f"PART B — every calculation column, with the exact Excel formula (live)"
fb[f"A{r}"].font = f_h2
r += 1
bh = ["Step", "Sheet", "Column / name", "Maths", "In plain words", "Excel formula (live, from the example row)", "Example", "Example value"]
for i, h in enumerate(bh, start=1):
    c = fb.cell(row=r, column=i, value=h)
    c.font = f_head
    c.fill = fill_calc
    c.alignment = center
fb.row_dimensions[r].height = 28
r += 1
FB_START = r


def fb_row(code, sheet_label, colname, math, words, sheet_ref, ex_label, fmt=None):
    global r
    fb[f"A{r}"] = code
    fb[f"B{r}"] = sheet_label
    fb[f"C{r}"] = colname
    fb[f"D{r}"] = math
    fb[f"E{r}"] = words
    fb[f"F{r}"] = f"=_xlfn.FORMULATEXT({sheet_ref})"
    fb[f"G{r}"] = ex_label
    fb[f"H{r}"] = f"={sheet_ref}"
    fb[f"A{r}"].font = f_bold
    for col in "BCDEG":
        fb[f"{col}{r}"].font = f_body
        fb[f"{col}{r}"].alignment = wrap
    fb[f"C{r}"].font = f_bold
    fb[f"D{r}"].font = Font(name=FONT, size=10, bold=True, color=NAVY)
    fb[f"F{r}"].font = Font(name="Consolas", size=9, color="404040")
    fb[f"F{r}"].alignment = wrap
    fb[f"H{r}"].font = f_val
    fb[f"H{r}"].alignment = Alignment(horizontal="right", vertical="top")
    if fmt:
        fb[f"H{r}"].number_format = fmt
    for col in "ABCDEFGH":
        fb[f"{col}{r}"].border = Border(bottom=thin)
        if col == "A":
            fb[f"{col}{r}"].alignment = wrap
    r += 1


fmt_by_col = {"D": "#,##0", "K": "#,##0", "O": "#,##0.0", "P": "0.000", "Q": "0.000", "S": "0.0", "T": "0.0", "X": "0.000", "Y": "0.00"}
for col, code, hd, _, math, words in FSTEPS:
    if code:
        fb_row(code, "Tolly Index Films", f"{col} · {hd}", math, words, f"{T}!{col}{KR}", EX_FILM, fmt_by_col.get(col))
    if col == "M":
        for ecol, ecode, ehd, _, emath, ewords in ESTEPS:
            if ecode:
                fb_row(ecode, "Era Cohorts", f"{ecol} · {ehd}", emath, ewords, f"{EC}!{ecol}{EX_YEAR_ROW}", f"year {years[EX_YEAR_ROW - 2]}",
                       {"C": "#,##0.0", "D": "0.000", "E": "0.00"}.get(ecol, "0"))
fb_row("M", "Settings", "AllMean · M", "M = mean TI of all complete films", "The 'average film' added k = 3 times to every hero.", f"Settings!C{ALLMEAN_ROW}", "all films", "0.0000")
for col, code, hd, _, math, words in HSTEPS:
    if code:
        fb_row(code, "Tolly Index Heroes", f"{col} · {hd}", math, words, f"{TH}!{col}{HR}", EX_HERO,
               {"H": "0%", "I": "0.000", "J": "#,##0.00", "K": "0.00", "L": "0.00"}.get(col))
fb.freeze_panes = fb[f"A{FB_START}"]

# ───────────────────────────── KPI Guide + Sources No Access (unchanged content) ─────────────────────────────
exec(open(os.path.join(HERE, "sources_sheets.py")).read())

# ───────────────────────────── Start Here ─────────────────────────────
sh.sheet_view.showGridLines = False
widths(sh, [3, 30, 110])
sh["B1"] = "Tolly Index workbook"
sh["B1"].font = Font(name=FONT, size=24, bold=True, color=NAVY)
sh["B2"] = "One score from 0 to 100 for every Telugu hero, built from what audiences think of his films — never from box office."
sh["B2"].font = f_sub
sh["B3"] = f"Data as of {AS_OF_TEXT} · method {VERSION} · {NF:,} films · {NH} heroes · every Tolly Index number in this file is a live Excel formula."
sh["B3"].font = f_small
r = 5
sh[f"B{r}"] = "How to read this workbook"
sh[f"B{r}"].font = f_h2
r += 1
how = [
    ("1. Dashboard", "See the result: hero ranking with ± bands, top films, and who is not ranked yet and why."),
    ("2. Formulas", "Every formula in one place: the method in eleven equations, then each calculation column with its maths and the exact Excel formula."),
    ("3. Film Calculator", f"Pick any film and watch its Tolly Index being built step by step, with the real numbers (example: {EX_FILM})."),
    ("4. Hero Calculator", f"Pick any hero and see how his films add up to his score, ± band and rank (example: {EX_HERO})."),
    ("5. Movies / Heroes", "The input data (blue). Fill a yellow cell and the film's status, its index and its hero's index all update."),
    ("6. Tolly Index Films / Heroes", "The full calculation for all films and heroes, one column per step (step codes match the Formulas sheet)."),
    ("7. KPI Guide / Sources No Access", "What each KPI means and where it comes from; the sources we could not use and how to get access."),
    ("8. Settings", "Every constant (weights, vote minimum, 2-year rule, 90% rule). Change one and the whole workbook recalculates."),
]
links = {"1. Dashboard": "Dashboard", "2. Formulas": "Formulas", "3. Film Calculator": "Film Calculator", "4. Hero Calculator": "Hero Calculator",
         "5. Movies / Heroes": "Movies", "6. Tolly Index Films / Heroes": "Tolly Index Films", "7. KPI Guide / Sources No Access": "KPI Guide", "8. Settings": "Settings"}
for lbl, words in how:
    sh[f"B{r}"] = lbl
    sh[f"B{r}"].hyperlink = f"#'{links[lbl]}'!A1"
    sh[f"B{r}"].font = f_hyper
    sh[f"C{r}"] = words
    sh[f"C{r}"].font = f_body
    sh[f"C{r}"].alignment = left_mid
    sh.row_dimensions[r].height = 22
    r += 1
r += 1
sh[f"B{r}"] = "The method in one breath"
sh[f"B{r}"].font = f_h2
r += 1
breath = [
    "A film is scored only when every input is present (the gate) and it is at least two years old.",
    "Three questions, each judged only against films released within a year of it: Did people like it? (50%) · How many cared? (30%) · Do people still care? (20%).",
    "A film with few votes is trusted less and pulled toward the typical film of its time (confidence c).",
    "A hero's score is the confidence-weighted average of his complete films, plus three 'average films'; he is ranked when ≥ 5 films and ≥ 90% of his films are complete.",
    "No money: budgets and collections are shown for context only, because rupees from different years are not comparable.",
]
for b in breath:
    sh[f"B{r}"] = "•"
    sh[f"B{r}"].alignment = Alignment(horizontal="right")
    sh[f"C{r}"] = b
    sh[f"C{r}"].font = f_body
    sh[f"C{r}"].alignment = left_mid
    r += 1
r += 1
sh[f"B{r}"] = "Colours"
sh[f"B{r}"].font = f_h2
r += 1
legend = [
    ("Blue text", "An input you can edit (Movies, Heroes, Settings, the calculator pickers).", f_input, None),
    ("Black text", "A formula.", f_body, None),
    ("Green text", "Taken from another sheet.", f_link, None),
    ("Grey italic", "The app's own value or a helper, kept only as a check.", f_ref, None),
    ("Yellow cell", "On Movies: a required input is missing for that film. Fill it and everything updates.", f_body, fill_yellow),
    ("Amber cell", "A result (pillar, Tolly Index, rank) in the calculators.", f_body, fill_amber),
]
for lbl, words, font, fill in legend:
    sh[f"B{r}"] = lbl
    sh[f"B{r}"].font = font
    if fill:
        sh[f"B{r}"].fill = fill
    sh[f"C{r}"] = words
    sh[f"C{r}"].font = f_body
    r += 1
r += 1
sh[f"B{r}"] = "Checks (both should be 0)"
sh[f"B{r}"].font = f_h2
r += 1
sh[f"B{r}"] = "Films where the workbook ≠ the app"
sh[f"C{r}"] = f"=SUMPRODUCT(--ISNUMBER({T}!$AB$2:$AB${LF}),--({T}!$AB$2:$AB${LF}<>0))"
CHECK_FILMS = f"C{r}"
r += 1
sh[f"B{r}"] = "Heroes where the workbook ≠ the app"
sh[f"C{r}"] = f"=SUMPRODUCT(--ISNUMBER({TH}!$X$2:$X${LH}),--({TH}!$X$2:$X${LH}<>0))"
CHECK_HEROES = f"C{r}"
for c in (CHECK_FILMS, CHECK_HEROES):
    sh[c].font = f_val
    sh[c].alignment = Alignment(horizontal="left")
    sh[c].number_format = "0"
r += 2
sh[f"B{r}"] = "Licence"
sh[f"B{r}"].font = f_h2
r += 1
sh[f"C{r}"] = "IMDb ratings and votes (Movies K–L) come from IMDb's non-commercial datasets: personal use only — do not publish those two columns. Wikidata is public domain; Wikipedia is CC BY-SA."
sh[f"C{r}"].font = f_body
sh[f"C{r}"].alignment = left_mid
r += 1
sh[f"C{r}"] = "If you change Settings, the 'Difference' columns stop being 0: they compare with the app's values for the default settings."
sh[f"C{r}"].font = f_body

# ───────────────────────────── order and save ─────────────────────────────
order = ["Start Here", "Dashboard", "Formulas", "Film Calculator", "Hero Calculator", "Movies", "Heroes", "Tolly Index Films", "Tolly Index Heroes",
         "KPI Guide", "Sources No Access", "Settings", "Era Cohorts", "Credits"]
wb._sheets = [wb[n] for n in order]
tab = {"Start Here": AMBER, "Dashboard": AMBER, "Formulas": AMBER, "Film Calculator": AMBER, "Hero Calculator": AMBER,
       "Movies": "1F4E79", "Heroes": "1F4E79", "Tolly Index Films": "375623", "Tolly Index Heroes": "375623",
       "KPI Guide": "7F7F7F", "Sources No Access": "7F7F7F", "Settings": "1F4E79", "Era Cohorts": "375623", "Credits": "375623"}
for ws in wb.worksheets:
    ws.sheet_view.zoomScale = 100
    ws.sheet_properties.tabColor = tab[ws.title]
wb.active = 0
wb.save(OUT)
print("saved", OUT, "films", NF, "heroes", NH, "credits", NC, "checks", CHECK_FILMS, CHECK_HEROES, "film TI cell", FC_TI)
