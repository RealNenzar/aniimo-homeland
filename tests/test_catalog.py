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

    def test_fixed_growth_does_not_use_workload(self):
        self.assertEqual(self.recipe('cocoa')['workload'], 0)
        self.assertEqual(self.recipe('cocoa')['seconds'], 2400)


if __name__ == '__main__':
    unittest.main()
