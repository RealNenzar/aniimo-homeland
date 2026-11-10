import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from catalog import build


class CatalogTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.recipes = build()

    def recipe(self, name):
        return next(r for r in self.recipes if r['id'] == name)

    def test_lumber_uses_eight_blocks(self):
        self.assertEqual(self.recipe('rough_lumber')['ingredients'], {'wood_block': 8})

    def test_pumpkin_points_and_seed_are_separate(self):
        pumpkin = self.recipe('magic_pumpkin')
        self.assertEqual((pumpkin['eventPoints'], pumpkin['seedCost']), (1, 4))

    def test_rv_21_22_values_and_ingredient_chain(self):
        new = [r for r in self.recipes if r['source'] == 'rv_21_22.csv']
        self.assertEqual(len(new), 31)
        outputs = {r['id'].removeprefix('quick_') if any(x['id'] == r['id'].removeprefix('quick_') for x in self.recipes) else r['id'] for r in self.recipes}
        for recipe in new:
            self.assertFalse(set(recipe['ingredients']) - outputs, recipe['id'])
        silver = self.recipe('silver_ore')
        self.assertEqual((silver['yield'], silver['byproductYield'], silver['abilityLevel']), (2, 165, 3))
        self.assertEqual(self.recipe('sorghum')['environment'], 'Adequate')
        self.assertEqual(self.recipe('sweet_cone')['environment'], 'Freeze')
        self.assertEqual(self.recipe('orange_flower_rice_drink')['ingredients'], {'sorghum_fermented_mash': 1, 'dried_orange_flower': 1})
        self.assertEqual(self.recipe('premium_quicksilver_springstone')['module'], 'crafting_module:8')

    def test_quick_recipe_yields_and_workloads(self):
        expected = {
            'quick_aromathyst': (12, 2700, 0), 'quick_wheat': (42, 0, 1200),
            'quick_potato': (46, 0, 2400), 'quick_rice': (79, 0, 2400),
            'quick_strawberry': (26, 0, 2400), 'quick_scales': (12, 2700, 0),
            'quick_wool': (6, 2700, 0), 'quick_agave': (10, 0, 2400),
            'quick_snowmelt_cold_spring': (9, 2700, 0), 'quick_sea_salt': (23, 2250, 0),
            'quick_pearl': (4, 2700, 0), 'quick_well_water': (15, 1800, 0),
            'quick_fresh_water': (17, 2700, 0), 'quick_deep_rock_spring_water': (9, 2700, 0),
            'quick_natural_mineral_spring_water': (9, 2700, 0), 'quick_bamboo': (23, 0, 2400),
            'quick_lemon': (42, 0, 2400), 'quick_maple_syrup': (30, 0, 2400),
            'quick_coconut': (8, 0, 2400),
        }
        actual = {r['id']: (r['yield'], r['workload'], r['seconds']) for r in self.recipes if r['id'].startswith('quick_')}
        self.assertEqual(actual, expected)
        self.assertEqual((self.recipe('agave')['yield'], self.recipe('agave')['seconds']), (6, 2400))

    def test_fixed_growth_does_not_use_workload(self):
        self.assertEqual(self.recipe('cocoa')['workload'], 0)
        self.assertEqual(self.recipe('cocoa')['seconds'], 2400)


if __name__ == '__main__':
    unittest.main()
