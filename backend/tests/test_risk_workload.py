import pytest
from app.risks.workload import WorkloadRiskEngine


def test_sprint_overload_detection():
    engine = WorkloadRiskEngine()
    sprints = [
        {"sprint_number": 1, "capacity": 20, "total_points": 25},
        {"sprint_number": 2, "capacity": 20, "total_points": 19},
    ]

    risks = engine.analyze(sprints)
    overload_risks = [r for r in risks if "Overloaded" in r.title]
    near_cap_risks = [r for r in risks if "Near Maximum Capacity" in r.title or "Low Capacity Margin" in r.title]

    assert len(overload_risks) == 1
    assert overload_risks[0].severity == "high"
    assert overload_risks[0].affected_sprint == 1

    assert len(near_cap_risks) == 1
    assert near_cap_risks[0].affected_sprint == 2


def test_uneven_workload_distribution():
    engine = WorkloadRiskEngine()
    sprints = [
        {"sprint_number": 1, "capacity": 20, "total_points": 20},
        {"sprint_number": 2, "capacity": 20, "total_points": 4},
        {"sprint_number": 3, "capacity": 20, "total_points": 18},
    ]

    risks = engine.analyze(sprints)
    uneven_risks = [r for r in risks if "Uneven" in r.title]
    assert len(uneven_risks) == 1
    assert uneven_risks[0].category == "workload"


def test_oversized_tasks_detection():
    engine = WorkloadRiskEngine()
    tasks = [
        {"id": "t1", "title": "Regular Task", "story_points": 3},
        {"id": "t2", "title": "Giant Refactoring Task", "story_points": 13},
    ]

    risks = engine.analyze([], tasks)
    oversized = [r for r in risks if "Oversized Task" in r.title]
    assert len(oversized) == 1
    assert oversized[0].severity == "high"
    assert "Giant Refactoring Task" in oversized[0].affected_tasks
