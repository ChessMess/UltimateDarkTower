#!/usr/bin/env python3
"""Analyze seed bit differences to map bits to fields.

Run from repo root: python3 packages/seed-decoder/scripts/analyze_bits.py
"""
baseline = '01001011001001011000101011001000010010101000011110001011010000'

variants = [
    ('AA91-AAMA-8CAI', 'Difficulty', '01001011001001010010111001101010010101000110100111001000111010'),
    ('AA9A-A12Y-T565', 'Player Count', '01001011001001011000101010110101010001000011001111100101101101'),
    ('AA9A-A21J-CRKV', 'Player Count', '01001011001001011000101010110111001101101001010100110110011111'),
    ('AA9A-A3IK-LLA5', 'Player Count', '01001011001001011000101010111010001100110010010010101011111101'),
    ('A19A-AAYR-M466', 'Adversary', '01001001010100011110110110001011010001110100001010000110011110'),
    ('AAAA-AAYS-GWWG', 'Main Goal', '01001011001001101111110001000010011000100110101000111010010000'),
    ('1A9A-AAKL-GSKH', 'Foe Level 2', '00001001011000110110111000001111101000000011100001100110100001'),
    ('2A9A-AAVR-FDD2', 'Foe Level 2', '00010000101100011110001100001000010110100010111110100001100110'),
    ('3A9A-AAMV-313T', 'Foe Level 2', '00011000000000000101011111111111111100101110011101111101011001'),
    ('8A9A-AALH-ZFI7', 'Foe Level 3', '00111100100010001010000011011000010111000011110111111000111111'),
    ('4A9A-AA36-9XH7', 'Foe Level 3', '00011111010011101100110011110110111100000000111110001110111011'),
    ('DA9A-AAAG-3VIL', 'Foe Level 3', '01100001000100001110100110110000001110011110100101101001001101'),
    ('HA9A-AADQ-MAD2', 'Foe Level 4', '01111110010010101011110110010000110011010101111010101111110110'),
    ('AH9A-AA3C-MN8P', 'Foe Level 4', '01001100100100010011110111110111110001100101101011011100101001'),
    ('HH9A-AAZP-1XVH', 'Foe Level 4', '01111111101101100111000011000010010001111010011010011010111101'),
    ('AA9A-AAIS-9PCX', 'Game Mode', '01001011001001011000101011001000011001110001110010110010100001'),
    ('AA9A-AA3G-T5NR', 'Game Mode', '01001011001001011000101011000111100010100100011101110111100111'),
    ('AA94-AAQY-4Q38', 'Game Type', '01001011001001010100110100110100101011101011001000011100010100'),
    ('AA94-AA3S-9XKH', 'Game Type', '01001011001001010100110100110011011000001100011011101000110001'),
    ('AA92-AANX-MVVU', 'Game Type', '01001011001001010011100010101101110010010011011110011111101010'),
    ('AA92-AAA2-B9QB', 'Game Type', '01001011001001010011100010101101000000010100001101000000000011'),
]

def diff_indices(a, b):
    assert len(a) == len(b)
    # 1-based indices from leftmost bit
    return [i+1 for i, (x, y) in enumerate(zip(a, b)) if x != y]

from collections import defaultdict

bit_map = defaultdict(set)
field_changes = defaultdict(list)

for seed, field, bits in variants:
    diffs = diff_indices(baseline, bits)
    field_changes[field].append(diffs)
    for i in diffs:
        bit_map[i].add(field)

fields = sorted(field_changes.keys())

print('Bit-length:', len(baseline))
print()

for field in fields:
    # union of all changed bits for this field
    union = sorted({i for lst in field_changes[field] for i in lst})
    if union:
        mn, mx = union[0], union[-1]
        length = mx - mn + 1
    else:
        mn = mx = length = 0
    # exclusive bits
    exclusive = [i for i in union if len(bit_map[i]) == 1]
    print(f'Field: {field}')
    print(f'  variants: {len(field_changes[field])}  changed bits total: {len(union)}')
    print(f'  span: {mn}..{mx} (length {length})')
    print(f'  exclusive bits: {len(exclusive)} -> {exclusive[:10]}{("..." if len(exclusive)>10 else "")}')
    print()

# Bits that are unique to a single field across all variants
unique_map = defaultdict(list)
for i, s in sorted(bit_map.items()):
    if len(s) == 1:
        fld = next(iter(s))
        unique_map[fld].append(i)

print('Summary of unique bits per field:')
for f in fields:
    u = unique_map.get(f, [])
    if u:
        print(f'  {f}: {len(u)} unique bits, sample: {u[:8]}{("..." if len(u)>8 else "")}')
    else:
        print(f'  {f}: 0 unique bits')

print() 

print('Top overlapping bits (bits changed by most different fields):')
by_overlap = sorted(bit_map.items(), key=lambda kv: (-len(kv[1]), kv[0]))
for i, s in by_overlap[:12]:
    print(f'  bit {i}: touched by {len(s)} fields -> {sorted(s)}')
print()

# Compute per-bit discrimination stats per field
from collections import Counter
import csv, os

fields_list = sorted(field_changes.keys())
variants_by_field = {f: len(field_changes[f]) for f in fields_list}
total_variants = sum(variants_by_field.values())

# precompute bit flips per variant list for quick lookup
bit_flips_by_field = {f: [set(lst) for lst in field_changes[f]] for f in fields_list}

per_bit_stats = {i: {} for i in range(1, len(baseline)+1)}
for bit in range(1, len(baseline)+1):
    for f in fields_list:
        tp = sum(1 for s in bit_flips_by_field[f] if bit in s)
        fn = variants_by_field[f] - tp
        # fp = flips for this bit in variants of other fields
        fp = sum(1 for other in fields_list if other != f for s in bit_flips_by_field[other] if bit in s)
        tn = total_variants - (tp + fn + fp)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        per_bit_stats[bit][f] = {
            'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn,
            'precision': round(precision, 3), 'sensitivity': round(sensitivity, 3)
        }

# Write CSV with per-bit per-field precision and sensitivity (wide format)
out_dir = os.path.join(os.path.dirname(__file__), '..', 'output')
os.makedirs(out_dir, exist_ok=True)
wide_path = os.path.join(out_dir, 'per_bit_field_stats.csv')
with open(wide_path, 'w', newline='') as f:
    writer = csv.writer(f)
    header = ['bit'] + [f + '::precision' for f in fields_list] + [f + '::sensitivity' for f in fields_list]
    writer.writerow(header)
    for bit in range(1, len(baseline)+1):
        row = [bit]
        row += [per_bit_stats[bit][f]['precision'] for f in fields_list]
        row += [per_bit_stats[bit][f]['sensitivity'] for f in fields_list]
        writer.writerow(row)

print('Wrote per-bit stats CSV:', wide_path)

# For each field, pick high-quality bits (precision>=0.8 and sensitivity>=0.5) and group contiguous bits
recommended_ranges = {}
for f in fields_list:
    good_bits = [bit for bit in range(1, len(baseline)+1)
                 if per_bit_stats[bit][f]['precision'] >= 0.8 and per_bit_stats[bit][f]['sensitivity'] >= 0.5]
    # group contiguous
    ranges = []
    if good_bits:
        start = prev = good_bits[0]
        for b in good_bits[1:]:
            if b == prev + 1:
                prev = b
                continue
            ranges.append((start, prev))
            start = prev = b
        ranges.append((start, prev))
    recommended_ranges[f] = ranges

print('\nRecommended compact subranges (precision>=0.8 & sensitivity>=0.5):')
for f in fields_list:
    ranges = recommended_ranges[f]
    if ranges:
        print(f'  {f}: ' + ', '.join(f'{a}..{b}' for a, b in ranges))
    else:
        print(f'  {f}: none')

print('\nFinished analysis.')

# ---- Mutual information (bit -> field) ----
import math

# Build list of variant (field, changed_bits_set)
variant_entries = []
for seed, field, bits in variants:
    variant_entries.append((field, set(diff_indices(baseline, bits))))

N = len(variant_entries)
fields_prob = {f: variants_by_field[f] / N for f in fields_list}

mi_by_bit = {}
for bit in range(1, len(baseline)+1):
    # counts
    count_x = sum(1 for _, s in variant_entries if bit in s)
    p_x1 = count_x / N
    p_x0 = 1 - p_x1
    mi = 0.0
    for x_val in (0, 1):
        if x_val == 1:
            px = p_x1
        else:
            px = p_x0
        if px == 0:
            continue
        for f in fields_list:
            # p(x,y)
            if x_val == 1:
                count_xy = sum(1 for fld, s in variant_entries if fld == f and bit in s)
            else:
                count_xy = sum(1 for fld, s in variant_entries if fld == f and bit not in s)
            if count_xy == 0:
                continue
            p_xy = count_xy / N
            py = fields_prob[f]
            mi += p_xy * math.log2(p_xy / (px * py))
    mi_by_bit[bit] = mi

# Write MI CSV and print top bits
mi_path = os.path.join(out_dir, 'per_bit_mi.csv')
with open(mi_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['bit', 'mi', 'count_flips'])
    for bit in range(1, len(baseline)+1):
        writer.writerow([bit, round(mi_by_bit[bit], 6), sum(1 for _, s in variant_entries if bit in s)])

print('\nWrote MI CSV:', mi_path)
top = sorted(mi_by_bit.items(), key=lambda kv: -kv[1])[:15]
print('\nTop bits by mutual information (bit: MI, flips):')
for bit, m in top:
    flips = sum(1 for _, s in variant_entries if bit in s)
    print(f'  bit {bit}: {round(m,6)}  flips={flips}  fields={sorted(bit_map.get(bit, []))}')
