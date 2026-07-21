import pytest
from app.dashboard.metrics import MetricsCalculator, metrics_calculator


def test_task_metrics_computation():
    calc = MetricsCalculator()
    tasks = [
        {"id": "1", "status": "done"},
        {"id": "2", "status": "done"},
        {"id": "3", "status": "todo"},
        {"id": "4", "status": "in_progress"},
    ]

    completed, remaining, total = calc.compute_task_metrics(tasks)
    assert completed == 2
    assert remaining == 2
    assert total == 4


def test_sprint_progress_computation():
    calc = MetricsCalculator()
    sprints = [
        {"sprint_number": 1, "status": "completed", "total_points": 20},
        {"sprint_number": 2, "status": "active", "total_points": 20},
        {"sprint_number": 3, "status": "planned", "total_points": 10},
    ]

    prog = calc.compute_sprint_progress(sprints)
    assert prog.total_sprints == 3
    assert prog.active_sprint == 2
    assert prog.total_points == 50
    assert prog.completed_points == 20
    assert prog.completion_percentage == 40.0


def test_capacity_summary_computation():
    calc = MetricsCalculator()
    sprints = [
        {"sprint_number": 1, "capacity": 20, "total_points": 25},
        {"sprint_number": 2, "capacity": 20, "total_points": 15},
    ]

    cap = calc.compute_capacity_summary(sprints)
    assert cap.average_capacity == 20.0
    assert cap.total_points == 40
    assert cap.capacity_utilization == 100.0
    assert cap.overloaded_sprints_count == 1
