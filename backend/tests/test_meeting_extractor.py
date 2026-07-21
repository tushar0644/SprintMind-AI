import pytest
from app.meetings.extractor import MeetingExtractor


def test_meeting_extractor_entities():
    extractor = MeetingExtractor()
    notes = """
    - TODO: implement OAuth login flow assigned to @tushar due Friday [high priority]
    - Decided: Use Supabase Auth as identity provider.
    - Blocker: Waiting on client secrets from DevOps team.
    - Risk: Potential delay due to third-party integration rate limits.
    """

    action_items, decisions, blockers, risks = extractor.extract_all(notes)

    assert len(action_items) >= 1
    assert "OAuth login" in action_items[0].title or "implement" in action_items[0].title.lower()
    assert action_items[0].assignee == "tushar"
    assert action_items[0].priority in ("high", "urgent")

    assert len(decisions) >= 1
    assert "Supabase Auth" in decisions[0].decision_text

    assert len(blockers) >= 1
    assert "DevOps team" in blockers[0].description

    assert len(risks) >= 1
    assert "delay" in risks[0].risk_title.lower() or "third-party" in risks[0].risk_title.lower()
