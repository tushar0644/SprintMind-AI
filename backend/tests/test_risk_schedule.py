import pytest
from app.risks.schedule import ScheduleRiskEngine


def test_low_confidence_score_detection():
    engine = ScheduleRiskEngine()
    timeline_data = {
        "confidence": 0.65,
        "estimated_duration_days": 28,
        "sprints_count": 2,
        "milestones": [],
    }

    risks = engine.analyze(timeline_data)
    conf_risks = [r for r in risks if "Confidence" in r.title]
    assert len(conf_risks) == 1
    assert conf_risks[0].severity == "high"
    assert conf_risks[0].category == "schedule"


def test_extended_schedule_duration_detection():
    engine = ScheduleRiskEngine()
    timeline_data = {
        "confidence": 0.85,
        "estimated_duration_days": 140,
        "sprints_count": 10,
        "milestones": [],
    }

    risks = engine.analyze(timeline_data)
    duration_risks = [r for r in risks if "Extended Project Schedule" in r.title]
    assert len(duration_risks) == 1
    assert duration_risks[0].severity == "high"


def test_delayed_mvp_milestone_risk():
    engine = ScheduleRiskEngine()
    timeline_data = {
        "confidence": 0.85,
        "estimated_duration_days": 70,
        "sprints_count": 5,
        "milestones": [
            {
                "name": "MVP Completion",
                "sprint_number": 4,
                "completion_percentage": 70.0,
                "description": "MVP complete",
            }
        ],
    }

    risks = engine.analyze(timeline_data)
    mvp_risks = [r for r in risks if "Delayed MVP Completion" in r.title]
    assert len(mvp_risks) == 1
    assert mvp_risks[0].severity == "high"
    assert mvp_risks[0].affected_sprint == 4
