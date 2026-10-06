from pathlib import Path
import unittest
from uuid import UUID

from analysis_engines import AnalysisResult, DummyEngine, EngineName, Finding, Severity


def make_finding(**overrides: object) -> Finding:
    values: dict[str, object] = {
        "finding_id": "00000000-0000-4000-8000-000000000001",
        "engine": EngineName.SAST,
        "category": "sast",
        "severity": Severity.LOW,
        "title": "Example finding",
        "file_path": "src/example.py",
        "line_number": 1,
        "evidence": "Example evidence",
        "confidence": 0.75,
        "recommendation": "Review the code",
    }
    values.update(overrides)
    return Finding(**values)  # type: ignore[arg-type]


class AnalysisContractTests(unittest.TestCase):
    def test_engine_and_severity_values_match_shared_contract(self) -> None:
        self.assertEqual(
            {value.value for value in EngineName},
            {"sast", "crypto", "dependency", "configuration"},
        )
        self.assertEqual(
            {value.value for value in Severity},
            {"critical", "high", "medium", "low"},
        )

    def test_finding_validates_uuid_required_values_and_ranges(self) -> None:
        self.assertTrue(UUID(make_finding().finding_id))
        for field, value in (
            ("finding_id", "not-a-uuid"),
            ("title", " "),
            ("engine", "unknown"),
            ("severity", "urgent"),
            ("line_number", 0),
            ("confidence", 1.1),
            ("is_development", "yes"),
        ):
            with self.subTest(field=field), self.assertRaises(ValueError):
                make_finding(**{field: value})

    def test_analysis_result_validates_counts_and_finding_members(self) -> None:
        finding = make_finding()
        result = AnalysisResult(findings=(finding,), files_processed=2, errors=("one unreadable file",))
        self.assertEqual(result.findings, (finding,))
        self.assertEqual(result.files_processed, 2)
        with self.assertRaises(ValueError):
            AnalysisResult(files_processed=-1)
        with self.assertRaises(ValueError):
            AnalysisResult(findings=(object(),))  # type: ignore[arg-type]

    def test_dummy_engine_returns_one_development_finding_with_uuid(self) -> None:
        result = DummyEngine().analyze([Path("example.py")])

        self.assertEqual(len(result.findings), 1)
        self.assertTrue(UUID(result.findings[0].finding_id))
        self.assertEqual(result.files_processed, 1)
        self.assertTrue(result.findings[0].is_development)
        self.assertEqual(result.findings[0].category, "sast")
        self.assertIn("development", result.findings[0].title.lower())
