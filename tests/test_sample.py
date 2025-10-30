import unittest

class TestMath(unittest.TestCase):
    def test_add(self):
        self.assertEqual(2 + 3, 5)

if __name__ == "__main__":
    unittest.main()
