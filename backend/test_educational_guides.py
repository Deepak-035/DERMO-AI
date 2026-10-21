import unittest
from fastapi.testclient import TestClient
from api.main import app
from api.ml.labels import CLASS_INFO
from api.services.guide_service import BASELINE_GUIDES, resolve_class_key
from api.services.report_service import generate_and_store_report
import inspect

class TestEducationalGuides(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_all_seven_classes_present_in_baseline(self):
        """Verify all 7 classification classes are defined with complete medical fields."""
        expected_keys = {
            "melanocytic_nevus",
            "melanoma",
            "benign_keratosis",
            "basal_cell_carcinoma",
            "actinic_keratoses",
            "vascular_lesion",
            "dermatofibroma",
        }
        self.assertEqual(set(BASELINE_GUIDES.keys()), expected_keys)

        required_fields = [
            "class_key",
            "display_name",
            "overview",
            "risk_factors",
            "warning_signs",
            "prevention",
            "recommended_actions",
            "treatment_overview",
            "urgency_level",
            "sources",
            "review_status",
        ]

        for key, guide in BASELINE_GUIDES.items():
            for field in required_fields:
                self.assertIn(field, guide, f"Field '{field}' missing in baseline guide '{key}'")
            self.assertIn(guide["urgency_level"], ["routine", "prompt", "urgent"])
            self.assertIn(guide["review_status"], ["draft", "reviewed", "published"])
            self.assertTrue(len(guide["risk_factors"]) > 0)
            self.assertTrue(len(guide["warning_signs"]) > 0)
            self.assertTrue(len(guide["prevention"]) > 0)
            self.assertTrue(len(guide["recommended_actions"]) > 0)
            self.assertTrue(len(guide["sources"]) > 0)

    def test_class_info_model_mapping(self):
        """Verify that every class in backend/api/ml/labels.py CLASS_INFO maps accurately."""
        expected_key_by_code = {
            "nv": "melanocytic_nevus",
            "mel": "melanoma",
            "bkl": "benign_keratosis",
            "bcc": "basal_cell_carcinoma",
            "akiec": "actinic_keratoses",
            "vasc": "vascular_lesion",
            "df": "dermatofibroma",
        }

        for idx, info in CLASS_INFO.items():
            code = info["code"]
            name = info["name"]
            expected_key = expected_key_by_code[code]

            # Test by code
            resolved_from_code = resolve_class_key(code)
            self.assertEqual(resolved_from_code, expected_key, f"Failed resolving code: {code}")

            # Test by name
            resolved_from_name = resolve_class_key(name)
            self.assertEqual(resolved_from_name, expected_key, f"Failed resolving name: {name}")

    def test_api_endpoint_retrieval_all_classes(self):
        """Test API endpoint GET /guides/{class_key} for all 7 classes."""
        test_identifiers = [
            ("nv", "melanocytic_nevus"),
            ("mel", "melanoma"),
            ("bkl", "benign_keratosis"),
            ("bcc", "basal_cell_carcinoma"),
            ("akiec", "actinic_keratoses"),
            ("vasc", "vascular_lesion"),
            ("df", "dermatofibroma"),
            ("Melanoma", "melanoma"),
            ("Basal Cell Carcinoma", "basal_cell_carcinoma"),
            ("Dermatofibroma", "dermatofibroma"),
        ]

        for identifier, expected_key in test_identifiers:
            response = self.client.get(f"/guides/{identifier}")
            self.assertEqual(
                response.status_code, 200, f"Failed endpoint for identifier: {identifier}"
            )
            data = response.json()
            self.assertTrue(data.get("success"))
            self.assertIsNotNone(data.get("guide"))
            self.assertEqual(data["guide"]["class_key"], expected_key)

    def test_api_endpoint_list_guides(self):
        """Test API endpoint GET /guides returns list of all 7 published guides."""
        response = self.client.get("/guides")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertGreaterEqual(data.get("count"), 7)
        keys = [g["class_key"] for g in data["guides"]]
        self.assertIn("melanoma", keys)
        self.assertIn("basal_cell_carcinoma", keys)

    def test_unknown_class_safe_handling(self):
        """Verify unknown or non-skin classes return 404 without crashing or falsifying."""
        unknown_inputs = [
            "unknown_disease_xyz",
            "normal_skin",
            "non_skin",
            "invalid_code",
        ]

        for unknown in unknown_inputs:
            response = self.client.get(f"/guides/{unknown}")
            self.assertEqual(
                response.status_code, 404, f"Unknown input '{unknown}' should return 404"
            )
            data = response.json()
            self.assertFalse(data.get("success"))
            self.assertIn("No published educational guide found", data.get("message", ""))

    def test_pdf_report_separation(self):
        """Verify that the existing report_service signature and logic is preserved."""
        sig = inspect.signature(generate_and_store_report)
        params = list(sig.parameters.keys())
        # Confirm no educational guide parameters leaked into report generator
        self.assertNotIn("guide", params)
        self.assertNotIn("educational_guide", params)
        self.assertIn("prediction_id", params)
        self.assertIn("prediction", params)
        self.assertIn("code", params)
        self.assertIn("confidence", params)


if __name__ == "__main__":
    unittest.main()
