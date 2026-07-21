import pytest
from app.meetings.summarizer import MeetingSummarizer


def test_meeting_summarizer_basic():
    summarizer = MeetingSummarizer()
    title = "Sprint 1 Sync"
    notes = """
    - Discussed API authentication architecture.
    - Agreed to use JWT bearer tokens for session management.
    - Assigned Tushar to finalize schema definitions.
    """

    summary = summarizer.summarize(title, notes)
    assert "Sprint 1 Sync" in summary
    assert "Discussed API authentication architecture" in summary


def test_meeting_summarizer_empty_notes():
    summarizer = MeetingSummarizer()
    summary = summarizer.summarize("Kickoff", "")
    assert "no detailed notes" in summary
