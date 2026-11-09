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

    def test_fixed_growth_does_not_use_workload(self):
        self.assertEqual(self.recipe('cocoa')['workload'], 0)
        self.assertEqual(self.recipe('cocoa')['seconds'], 2400)


if __name__ == '__main__':
    unittest.main()
