"""Convert attributed Aniimax CSV data into a portable recipe catalog."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
EXCLUDE = {'aniimo_requirements', 'grower_steps', 'pair_coverage', 'unverified'}


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as file:
        return [{k.strip(): (v or '').strip() for k, v in row.items()}
                for row in csv.DictReader(file, skipinitialspace=True)]


def number(value, default=0):
    return float(value) if value else default


def build():
    requirements = {(r['facility'], r['name']): r for r in read_csv(DATA / 'aniimo_requirements.csv')}
    unverified = {(r['facility'], r['name']) for r in read_csv(DATA / 'unverified.csv')}
    recipes = []
    for path in sorted(DATA.glob('*.csv')):
        if path.stem in EXCLUDE:
            continue
        for row in read_csv(path):
            facility = row.get('facility') or path.stem.replace('_', ' ').title()
            names = row.get('raw_materials', '').split(';') if row.get('raw_materials') else []
            amounts = row.get('required_amount', '').split(';') if row.get('required_amount') else []
            if len(names) != len(amounts):
                raise ValueError(f"Invalid ingredients: {path.name}: {row['name']}")
            requirement = requirements.get((facility, row['name']), {})
            recipes.append({
                'id': row['name'], 'facility': facility,
                'ingredients': dict(zip(names, map(float, amounts))),
                'yield': number(row.get('yield'), 1),
                'seconds': number(row.get('production_time')),
                'workload': number(row.get('workload')),
                'facilityLevel': int(number(row.get('facility_level'), 1)),
                'module': row.get('module_requirement', ''),
                'environment': row.get('environment', ''),
                'ability': requirement.get('ability', ''),
                'abilityLevel': int(number(requirement.get('min_level'), 1)),
                'sellValue': number(row.get('sell_value')),
                'sellCurrency': row.get('sell_currency') or 'coins',
                'seedCost': number(row.get('seed_cost') or row.get('cost')),
                'byproductYield': number(row.get('byproduct_yield')),
                'eventPoints': number(row.get('points')),
                'event': path.stem if path.stem in {'magical_wonder_night', 'harvest_moon_festival'} else None,
                'verified': (facility, row['name']) not in unverified,
                'source': path.name,
            })
    return recipes


if __name__ == '__main__':
    recipes = build()
    (DATA / 'catalog.json').write_text(json.dumps(recipes, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(recipes)} recipes')
