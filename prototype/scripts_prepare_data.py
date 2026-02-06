import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import re
import csv
import pandas as pd

base = Path('/home/pablo/dev/ecs272-project')

# --- Convert oscars.xlsx to CSV ---
xlsx_path = base / 'data' / 'oscars.xlsx'
out_csv = base / 'data' / 'processed' / 'oscars.csv'

ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

with zipfile.ZipFile(xlsx_path, 'r') as z:
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in ss_root.findall('main:si', ns):
            texts = [t.text or '' for t in si.findall('.//main:t', ns)]
            shared.append(''.join(texts))

    wb_root = ET.fromstring(z.read('xl/workbook.xml'))
    sheets = []
    for sheet in wb_root.findall('main:sheets/main:sheet', ns):
        name = sheet.attrib.get('name')
        r_id = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        sheets.append((name, r_id))

    rels_root = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rels = {}
    for rel in rels_root.findall('.//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
        rels[rel.attrib.get('Id')] = rel.attrib.get('Target')

    def col_to_idx(cell_ref):
        m = re.match(r'([A-Z]+)', cell_ref)
        if not m:
            return None
        col = m.group(1)
        idx = 0
        for ch in col:
            idx = idx * 26 + (ord(ch) - ord('A') + 1)
        return idx - 1

    def cell_value(c):
        t = c.attrib.get('t')
        v = c.find('main:v', ns)
        if v is None:
            return ''
        val = v.text or ''
        if t == 's':
            try:
                return shared[int(val)]
            except Exception:
                return val
        return val

    # use first sheet only
    name, r_id = sheets[0]
    target = rels.get(r_id)
    sheet_path = 'xl/' + target
    root = ET.fromstring(z.read(sheet_path))

    rows = []
    max_cols = 0
    for row in root.findall('.//main:sheetData/main:row', ns):
        row_vals = {}
        for c in row.findall('main:c', ns):
            ref = c.attrib.get('r')
            if not ref:
                continue
            idx = col_to_idx(ref)
            if idx is None:
                continue
            row_vals[idx] = cell_value(c)
            if idx + 1 > max_cols:
                max_cols = idx + 1
        rows.append(row_vals)

    table = []
    for row_vals in rows:
        row = [''] * max_cols
        for idx, val in row_vals.items():
            row[idx] = val
        table.append(row)

    header = table[0]
    data = table[1:]

    with out_csv.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(data)

# --- Convert oscars.dat.txt to CSV ---
text_path = base / 'data' / 'oscars.dat.txt'
out_age = base / 'data' / 'processed' / 'oscars_age_winners.csv'

# Use pandas fixed-width inference with latin-1 encoding to avoid decode errors.
fwf = pd.read_fwf(text_path, header=None, encoding='latin-1')
fwf.columns = [
    'gender',
    'index',
    'award_year',
    'name',
    'film',
    'age',
    'birthplace',
    'birth_month',
    'birth_day',
    'birth_year',
]
fwf.to_csv(out_age, index=False)

print('Wrote:', out_csv)
print('Wrote:', out_age)
