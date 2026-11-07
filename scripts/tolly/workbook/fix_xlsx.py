"""Turns LibreOffice-notation sheet references in cached FORMULATEXT results into Excel notation, and asks Excel to recalculate on open."""
import re, shutil, sys, zipfile
src = sys.argv[1]; tmp = src + ".tmp"
zin = zipfile.ZipFile(src); zout = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
n = 0
def fix_v(m):
    global n
    s = m.group(0)
    t = re.sub(r"\$(&apos;|')((?:(?!\1).)+)\1\.", lambda k: f"{k.group(1)}{k.group(2)}{k.group(1)}!", s)
    t = re.sub(r"\$(Movies|Heroes|Credits|Settings)\.", r"\1!", t)
    if t != s: n += 1
    return t
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename.startswith("xl/worksheets/sheet") or item.filename == "xl/sharedStrings.xml":
        x = data.decode("utf8")
        x = re.sub(r"<v>[^<]*</v>|<t[^>]*>[^<]*</t>", fix_v, x)
        data = x.encode("utf8")
    if item.filename == "xl/workbook.xml":
        x = data.decode("utf8")
        if "<calcPr" in x:
            x = re.sub(r"<calcPr([^/]*)/>", lambda m: "<calcPr" + re.sub(r'\s*fullCalcOnLoad="[^"]*"', "", m.group(1)) + ' fullCalcOnLoad="1"/>', x)
        else:
            x = x.replace("</workbook>", '<calcPr fullCalcOnLoad="1"/></workbook>')
        data = x.encode("utf8")
    zout.writestr(item, data)
zout.close(); shutil.move(tmp, src)
print("fixed", n, "cached strings")
