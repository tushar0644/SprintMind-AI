import pytest
from app.estimation.velocity import VelocityCalculator, velocity_calculator


def test_velocity_default_capacity_fallback():
    calc = VelocityCalculator()
    v = calc.calculate_velocity([], sprint_duration_days=14, default_capacity=20)
    assert v == 20.0


def test_velocity_from_planned_sprints():
    calc = VelocityCalculator()
    sprints = [
        {"sprint_number": 1, "total_points": 18, "status": "planned", "capacity": 20},
        {"sprint_number": 2, "total_points": 22, "status": "planned", "capacity": 20},
    ]
    v = calc.calculate_velocity(sprints)
    assert v == 20.0


def test_velocity_from_completed_sprints():
    calc = VelocityCalculator()
    sprints = [
        {
            "sprint_number": 1,
            "total_points": 20,
            "status": "completed",
            "tasks": [
                {"story_points": 5, "status": "done"},
                {"story_points": 10, "status": "done"},
            ],
        },
        {
            "sprint_number": 2,
            "total_points": 20,
            "status": "completed",
            "tasks": [
                {"story_points": 8, "status": "done"},
                {"story_points": 12, "status": "done"},
            ],
        },
        {"sprint_number": 3, "total_points": 25, "status": "planned"},
    ]
    v = calc.calculate_velocity(sprints)
    assert v == 17.5  # (15 + 20) / 2


def test_configurable_sprint_duration_validation():
    calc = VelocityCalculator()
    assert calc.validate_duration(14) == 14
    assert calc.validate_duration(7) == 7
    assert calc.validate_duration(0) == 14
    assert calc.validate_duration(-5) == 14


def test_confidence_calculation_with_completed_sprints():
    calc = VelocityCalculator()
    sprints = [
        {"sprint_number": 1, "total_points": 20, "status": "completed"},
        {"sprint_number": 2, "total_points": 20, "status": "completed"},
        {"sprint_number": 3, "total_points": 20, "status": "planned"},
    ]
    conf = calc.calculate_confidence(sprints, average_velocity=20.0, tasks_unscheduled=0)
    assert conf >= 0.85
    assert conf <= 0.95
