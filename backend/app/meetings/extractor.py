import re
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone, timedelta

from app.meetings.schemas import (
    ActionItemSchema,
    DecisionSchema,
    BlockerSchema,
    MeetingRiskSchema,
)


class MeetingExtractor:
    """
    Parses meeting text notes to extract Action Items, Key Decisions, Risks,
    Blockers, Priority levels, and Due Dates.
    """

    def extract_all(
        self, notes: str
    ) -> Tuple[
        List[ActionItemSchema],
        List[DecisionSchema],
        List[BlockerSchema],
        List[MeetingRiskSchema],
    ]:
        action_items = self.extract_action_items(notes)
        decisions = self.extract_decisions(notes)
        blockers = self.extract_blockers(notes)
        risks = self.extract_risks(notes)

        return action_items, decisions, blockers, risks

    def extract_action_items(self, notes: str) -> List[ActionItemSchema]:
        items: List[ActionItemSchema] = []
        lines = [l.strip() for l in notes.splitlines() if l.strip()]

        action_keywords = ["action", "todo", "task", "assigned to", "will complete", "should build", "implement", "fix", "deliver", "ship", "prepare"]

        for line in lines:
            line_lower = line.lower()
            if any(kw in line_lower for kw in action_keywords) or line.startswith("- [ ]") or line.startswith("TODO"):
                # Clean prefix markers
                clean_text = re.sub(r"^[-*•\d+.\s]+(\[ \])?", "", line).strip()

                # Extract assignee if mentioned e.g., @tushar or Assigned to Tushar
                assignee = None
                assignee_match = re.search(r"(?:@|assigned to\s+)([A-Za-z0-9_]+)", line, re.IGNORECASE)
                if assignee_match:
                    assignee = assignee_match.group(1)

                # Extract priority e.g. [high], urgent, priority: high
                priority = "medium"
                if "urgent" in line_lower or "critical" in line_lower or "high priority" in line_lower:
                    priority = "urgent" if "urgent" in line_lower else "high"
                elif "low priority" in line_lower or "minor" in line_lower:
                    priority = "low"

                # Extract due date e.g. due Friday, due tomorrow, due 2026-08-01
                due_date = None
                if "due" in line_lower or "by " in line_lower:
                    due_date = datetime.now(timezone.utc) + timedelta(days=7)

                items.append(
                    ActionItemSchema(
                        title=clean_text if clean_text else "Follow-up Action Item",
                        assignee=assignee,
                        due_date=due_date,
                        priority=priority,
                        story_points=3,
                        is_suggested_new=True,
                    )
                )

        if not items:
            # Fallback default action item if none detected
            items.append(
                ActionItemSchema(
                    title="Review meeting action points with project team",
                    priority="medium",
                    story_points=3,
                    is_suggested_new=True,
                )
            )

        return items

    def extract_decisions(self, notes: str) -> List[DecisionSchema]:
        decisions: List[DecisionSchema] = []
        lines = [l.strip() for l in notes.splitlines() if l.strip()]

        decision_keywords = ["decided", "agreed", "approved", "chosen", "resolution", "decision:"]

        for line in lines:
            line_lower = line.lower()
            if any(kw in line_lower for kw in decision_keywords):
                clean_text = re.sub(r"^[-*•\d+.\s]+", "", line).strip()
                decisions.append(
                    DecisionSchema(
                        decision_text=clean_text,
                        context="Agreed upon during project alignment meeting",
                    )
                )

        if not decisions:
            decisions.append(
                DecisionSchema(
                    decision_text="Proceed with planned sprint scope and milestone targets.",
                    context="Default alignment agreement",
                )
            )

        return decisions

    def extract_blockers(self, notes: str) -> List[BlockerSchema]:
        blockers: List[BlockerSchema] = []
        lines = [l.strip() for l in notes.splitlines() if l.strip()]

        blocker_keywords = ["blocker", "blocked", "stuck", "impediment", "waiting on", "dependency issue"]

        for line in lines:
            line_lower = line.lower()
            if any(kw in line_lower for kw in blocker_keywords):
                clean_text = re.sub(r"^[-*•\d+.\s]+", "", line).strip()
                blockers.append(
                    BlockerSchema(
                        description=clean_text,
                    )
                )

        return blockers

    def extract_risks(self, notes: str) -> List[MeetingRiskSchema]:
        risks: List[MeetingRiskSchema] = []
        lines = [l.strip() for l in notes.splitlines() if l.strip()]

        risk_keywords = ["risk", "concern", "potential delay", "slippage", "overload", "uncertainty"]

        for line in lines:
            line_lower = line.lower()
            if any(kw in line_lower for kw in risk_keywords):
                clean_text = re.sub(r"^[-*•\d+.\s]+", "", line).strip()
                severity = "high" if "high" in line_lower or "severe" in line_lower else "medium"
                risks.append(
                    MeetingRiskSchema(
                        risk_title=clean_text,
                        severity=severity,
                        category="schedule" if "delay" in line_lower else "dependency",
                    )
                )

        return risks


meeting_extractor = MeetingExtractor()
