from typing import List, Dict, Any, Union
import statistics
from app.risks.schemas import RiskItem


class WorkloadRiskEngine:
    """
    Analyzes team workload, capacity utilization, task sizing, and point distribution across sprints.
    """

    def analyze(
        self,
        sprints: List[Union[Dict[str, Any], Any]],
        tasks: List[Union[Dict[str, Any], Any]] = None,
    ) -> List[RiskItem]:
        risks: List[RiskItem] = []
        if not sprints and not tasks:
            return risks

        tasks = tasks or []

        def get_val(item: Any, key: str, default: Any = None):
            if isinstance(item, dict):
                return item.get(key, default)
            return getattr(item, key, default)

        # 1. Sprint Overload & Low Capacity Margin Detection
        for s in sprints:
            num = int(get_val(s, "sprint_number", 1))
            pts = int(get_val(s, "total_points", 0))
            cap = int(get_val(s, "capacity", 20))

            if cap > 0:
                utilization = pts / cap

                if pts > cap:
                    risks.append(
                        RiskItem(
                            title=f"Sprint {num} Overloaded ({pts}/{cap} pts)",
                            description=f"Sprint {num} total story points ({pts} pts) exceeds maximum capacity limit ({cap} pts). High probability of task rollover.",
                            severity="high",
                            category="workload",
                            affected_sprint=num,
                            recommendation="Move non-critical tasks to subsequent sprints to stay within story point capacity limit.",
                            confidence=0.92,
                        )
                    )
                elif utilization >= 0.95:
                    risks.append(
                        RiskItem(
                            title=f"Sprint {num} Near Maximum Capacity ({pts}/{cap} pts)",
                            description=f"Sprint {num} is filled to {int(utilization * 100)}% capacity. High risk of delay if any task estimation expands.",
                            severity="medium",
                            category="workload",
                            affected_sprint=num,
                            recommendation="Reserve at least 10-15% capacity margin for unexpected bug fixes and code review feedback.",
                            confidence=0.87,
                        )
                    )
                elif 0.90 <= utilization < 0.95:
                    risks.append(
                        RiskItem(
                            title=f"Low Capacity Margin in Sprint {num}",
                            description=f"Sprint {num} has under 10% capacity margin remaining. Low resilience against unforeseen complexity.",
                            severity="low",
                            category="workload",
                            affected_sprint=num,
                            recommendation="Maintain an explicit capacity buffer for code reviews and QA verification.",
                            confidence=0.80,
                        )
                    )

        # 2. Uneven Sprint Workload Distribution
        points_list = [int(get_val(s, "total_points", 0)) for s in sprints if int(get_val(s, "total_points", 0)) > 0]
        if len(points_list) >= 2:
            try:
                mean_pts = statistics.mean(points_list)
                stdev_pts = statistics.stdev(points_list)
                cv = stdev_pts / mean_pts if mean_pts > 0 else 0

                if cv >= 0.35:
                    max_sprint = max(sprints, key=lambda s: int(get_val(s, "total_points", 0)))
                    min_sprint = min(sprints, key=lambda s: int(get_val(s, "total_points", 0)))
                    max_num = get_val(max_sprint, "sprint_number", 1)
                    min_num = get_val(min_sprint, "sprint_number", 1)

                    risks.append(
                        RiskItem(
                            title="Uneven Sprint Workload Distribution",
                            description=f"Significant story point imbalance across planned sprints (e.g. Sprint {max_num}: {get_val(max_sprint, 'total_points')} pts vs Sprint {min_num}: {get_val(min_sprint, 'total_points')} pts).",
                            severity="medium",
                            category="workload",
                            affected_sprint=max_num,
                            recommendation="Smooth out task allocation across sprints to ensure steady, predictable velocity.",
                            confidence=0.85,
                        )
                    )
            except Exception:
                pass

        # 3. Oversized Tasks Detection
        for t in tasks:
            t_title = str(get_val(t, "title", "Untitled Task"))
            t_pts = int(get_val(t, "story_points", 1) or 1)

            if t_pts >= 8:
                severity = "high" if t_pts >= 13 else "medium"
                risks.append(
                    RiskItem(
                        title=f"Oversized Task Detected: '{t_title}' ({t_pts} pts)",
                        description=f"Task '{t_title}' is estimated at {t_pts} story points. High-estimate tasks carry elevated uncertainty and risk blocking sprint completion.",
                        severity=severity,
                        category="workload",
                        affected_tasks=[t_title],
                        recommendation="Decompose oversized task into smaller sub-tasks estimated at 3-5 story points or less.",
                        confidence=0.90,
                    )
                )

        return risks


workload_risk_engine = WorkloadRiskEngine()
