import pytest
from app.dashboard.health import HealthScoreCalculator, health_score_calculator


def test_health_score_perfect_conditions():
    calc = HealthScoreCalculator()
    risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    details = calc.calculate_health_score(
        risk_counts=risk_counts,
        completion_percentage=50.0,
        overloaded_sprints_count=0,
        confidence=0.90,
        velocity=20.0,
    )

    assert details.score == 100.0
    assert details.status == "healthy"
    assert "healthy status" in details.summary


def test_health_score_with_risk_deductions():
    calc = HealthScoreCalculator()
    risk_counts = {"critical": 1, "high": 2, "medium": 1, "low": 0}
    # Deductions: 1*15 + 2*8 + 1*3 = 15 + 16 + 3 = 34 => 100 - 34 = 66.0
    details = calc.calculate_health_score(
        risk_counts=risk_counts,
        completion_percentage=20.0,
        overloaded_sprints_count=0,
        confidence=0.85,
        velocity=15.0,
    )

    assert details.score == 66.0
    assert details.status == "warning"


def test_health_score_critical_status():
    calc = HealthScoreCalculator()
    risk_counts = {"critical": 3, "high": 2, "medium": 0, "low": 0}
    # Deductions: 3*15 + 2*8 = 45 + 16 = 61 + overloaded penalty 10 = 71 => 100 - 71 = 29.0
    details = calc.calculate_health_score(
        risk_counts=risk_counts,
        completion_percentage=10.0,
        overloaded_sprints_count=1,
        confidence=0.60,
        velocity=10.0,
    )

    assert details.score <= 50.0
    assert details.status == "critical"
