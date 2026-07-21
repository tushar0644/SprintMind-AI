from typing import List, Dict, Any, Union
from datetime import datetime
from app.risks.schemas import RiskItem


class ScheduleRiskEngine:
    """
    Analyzes project delivery timelines, forecast confidence ratings, milestone dates, and schedule buffers.
    """

    def analyze(
        self,
        timeline_data: Union[Dict[str, Any], Any],
    ) -> List[RiskItem]:
        risks: List[RiskItem] = []
        if not timeline_data:
            return risks

        def get_val(item: Any, key: str, default: Any = None):
            if isinstance(item, dict):
                return item.get(key, default)
            return getattr(item, key, default)

        confidence = float(get_val(timeline_data, "confidence", 0.85))
        duration_days = int(get_val(timeline_data, "estimated_duration_days", 0) or get_val(timeline_data, "estimated_duration", 0) or 0)
        sprint_dates = get_val(timeline_data, "sprint_dates", []) or []
        milestones = get_val(timeline_data, "milestones", []) or []
        sprints_count = len(sprint_dates) or int(get_val(timeline_data, "sprints_count", 0))

        # 1. Confidence Score Issues Detection
        if confidence < 0.80:
            confidence_pct = int(confidence * 100) if confidence <= 1.0 else int(confidence)
            severity = "high" if confidence < 0.70 else "medium"
            risks.append(
                RiskItem(
                    title=f"Low Forecast Confidence Score ({confidence_pct}%)",
                    description=f"Estimation confidence rating is {confidence_pct}%. High variance in task estimations or unscheduled dependencies reduces forecast predictability.",
                    severity=severity,
                    category="schedule",
                    recommendation="Detail task story points and resolve prerequisite dependencies to improve schedule certainty.",
                    confidence=0.90,
                )
            )

        # 2. Timeline Slippage & Duration Exposure Detection
        if duration_days >= 60 or sprints_count >= 5:
            severity = "high" if duration_days >= 120 or sprints_count >= 8 else "medium"
            risks.append(
                RiskItem(
                    title=f"Extended Project Schedule ({duration_days} Days / {sprints_count} Sprints)",
                    description=f"Project delivery spans {duration_days} calendar days across {sprints_count} planned sprints. Extended delivery horizons increase exposure to scope creep and schedule slippage.",
                    severity=severity,
                    category="schedule",
                    recommendation="Establish mid-project milestone reviews and prioritize MVP deliverables early.",
                    confidence=0.85,
                )
            )

        # 3. Milestone Schedule Risks Detection
        for m in milestones:
            m_name = str(get_val(m, "name", "Milestone"))
            m_num = int(get_val(m, "sprint_number", 1))
            m_pct = float(get_val(m, "completion_percentage", 0.0))

            if m_name == "MVP Completion" and (m_pct > 60.0 or m_num > 3):
                risks.append(
                    RiskItem(
                        title=f"Delayed MVP Completion (Sprint {m_num})",
                        description=f"MVP Completion is scheduled for Sprint {m_num} ({int(m_pct)}% of total points). Delaying MVP delivery risks late stakeholder feedback.",
                        severity="high",
                        category="schedule",
                        affected_sprint=m_num,
                        recommendation="Re-prioritize core functional capabilities into Sprint 1 and Sprint 2 to accelerate MVP milestone delivery.",
                        confidence=0.88,
                    )
                )

        return risks


schedule_risk_engine = ScheduleRiskEngine()
