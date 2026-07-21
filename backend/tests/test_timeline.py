import pytest
from datetime import datetime, timezone, timedelta
from app.estimation.timeline import TimelinePredictor, timeline_predictor


def test_timeline_empty_sprints():
    pred = TimelinePredictor()
    start = datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc)
    p_start, p_finish, duration, entries = pred.predict_timeline([], start_date=start, sprint_duration_days=14)
    assert p_start == start
    assert p_finish == start + timedelta(days=14)
    assert duration == 14
    assert entries == []


def test_timeline_sequential_sprints_prediction():
    pred = TimelinePredictor()
    start = datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc)
    sprints = [
        {"sprint_number": 1, "name": "Sprint 1", "total_points": 15, "tasks": [1, 2], "status": "completed"},
        {"sprint_number": 2, "name": "Sprint 2", "total_points": 20, "tasks": [3, 4], "status": "planned"},
        {"sprint_number": 3, "name": "Sprint 3", "total_points": 18, "tasks": [5], "status": "planned"},
    ]

    p_start, p_finish, duration, entries = pred.predict_timeline(sprints, start_date=start, sprint_duration_days=14)

    assert len(entries) == 3
    assert entries[0].sprint_number == 1
    assert entries[0].start_date == start
    assert entries[0].end_date == start + timedelta(days=14)

    assert entries[1].sprint_number == 2
    assert entries[1].start_date == start + timedelta(days=14)
    assert entries[1].end_date == start + timedelta(days=28)

    assert entries[2].sprint_number == 3
    assert entries[2].start_date == start + timedelta(days=28)
    assert entries[2].end_date == start + timedelta(days=42)

    assert p_start == start
    assert p_finish == start + timedelta(days=42)
    assert duration == 42


def test_timeline_custom_sprint_duration():
    pred = TimelinePredictor()
    start = datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc)
    sprints = [
        {"sprint_number": 1, "name": "Sprint 1", "total_points": 10},
        {"sprint_number": 2, "name": "Sprint 2", "total_points": 10},
    ]

    p_start, p_finish, duration, entries = pred.predict_timeline(sprints, start_date=start, sprint_duration_days=7)

    assert duration == 14
    assert entries[0].end_date == start + timedelta(days=7)
    assert entries[1].end_date == start + timedelta(days=14)
