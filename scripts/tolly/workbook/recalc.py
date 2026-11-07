"""Recalculates every formula in an .xlsx with LibreOffice (headless), saves the cached values,
and reports any formula errors. Needs LibreOffice (`soffice`) and openpyxl.

Usage: python3 scripts/tolly/workbook/recalc.py <file.xlsx> [timeout_seconds]
"""
import shutil
import subprocess
import sys
import tempfile
import warnings
from pathlib import Path

MACRO = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "module.dtd">
<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" script:language="StarBasic">
Sub Recalc(path As String)
  Dim args(0) As New com.sun.star.beans.PropertyValue
  args(0).Name = "Hidden"
  args(0).Value = True
  doc = StarDesktop.loadComponentFromURL(ConvertToURL(path), "_blank", 0, args())
  doc.calculateAll()
  doc.store()
  doc.close(True)
End Sub
</script:module>"""
ERRORS = ("#NAME?", "#REF!", "#VALUE!", "#DIV/0!", "#N/A", "#NUM!", "#NULL!")


def main():
    path = Path(sys.argv[1]).resolve()
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 900
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        sys.exit("LibreOffice (soffice) is not installed")
    with tempfile.TemporaryDirectory() as profile:
        url = Path(profile).as_uri()
        # First start creates the profile; then the macro goes into its Standard library.
        subprocess.run([soffice, "--headless", "--terminate_after_init", f"-env:UserInstallation={url}"], check=True, timeout=120, capture_output=True)
        lib = Path(profile) / "user" / "basic" / "Standard"
        lib.mkdir(parents=True, exist_ok=True)
        (lib / "Module1.xba").write_text(MACRO)
        script_xlb = lib / "script.xlb"
        if "Module1" not in (script_xlb.read_text() if script_xlb.exists() else ""):
            script_xlb.write_text(
                '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE library:library PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "library.dtd">\n'
                '<library:library xmlns:library="http://openoffice.org/2000/library" library:name="Standard" library:readonly="false" library:passwordprotected="false">\n'
                ' <library:element library:name="Module1"/>\n</library:library>\n'
            )
        subprocess.run([soffice, "--headless", f"-env:UserInstallation={url}", f"macro:///Standard.Module1.Recalc(\"{path}\")"], check=True, timeout=timeout, capture_output=True)

    warnings.filterwarnings("ignore")
    from openpyxl import load_workbook

    wb = load_workbook(path, data_only=True)
    errors = {}
    formulas = 0
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                if isinstance(c.value, str) and c.value in ERRORS:
                    errors.setdefault(c.value, []).append(f"{ws.title}!{c.coordinate}")
    wbf = load_workbook(path)
    for ws in wbf.worksheets:
        for row in ws.iter_rows():
            for c in row:
                if isinstance(c.value, str) and c.value.startswith("="):
                    formulas += 1
    total = sum(len(v) for v in errors.values())
    print(f"recalculated {path.name}: {formulas} formulas, {total} errors")
    for k, v in errors.items():
        print(f"  {k}: {len(v)} e.g. {', '.join(v[:5])}")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
