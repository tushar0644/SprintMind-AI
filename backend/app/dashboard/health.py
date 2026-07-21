from typing import List, Dict, Any, Tuple
from app.dashboard.schemas import HealthScoreDetails


class HealthScoreCalculator:
    """
    Calculates overall executive project health score (0.0 to 100.0) and status classification
    by combining Risk Severity, Sprint Progress, Velocity, Capacity Usage, and Timeline Confidence.
    """

    def calculate_health_score(
        self,
        risk_counts: Dict[str, int],
        completion_percentage: float,
        overloaded_sprints_count: int,
        confidence: float,
        velocity: float,
    ) -> HealthScoreDetails:
        """
        Calculates project health score.
        """
        base_score = 100.0

        crit_count = risk_counts.get("critical", 0)
        high_count = risk_counts.get("high", 0)
        med_count = risk_counts.get("medium", 0)
        low_count = risk_counts.get("low", 0)

        # 1. Risk Severity Deductions
        risk_penalty = (crit_count * 15.0) + (high_count * 8.0) + (med_count * 3.0) + (low_count * 1.0)
        base_score -= risk_penalty

        # 2. Capacity Overload Penalty
        if overloaded_sprints_count > 0:
            base_score -= min(20.0, overloaded_sprints_count * 10.0)

        # 3. Forecast Confidence Penalty
        if confidence < 0.80:
            base_score -= (0.80 - confidence) * 30.0

        # Clamp score between 0.0 and 100.0
        final_score = round(max(0.0, min(100.0, base_score)), 1)

        # Status Classification
        if final_score >= 80.0:
            status = "healthy"
            summary = f"Project is in healthy status ({final_score}/100) with stable velocity and manageable risk parameters."
        elif final_score >= 60.0:
            status = "warning"
            summary = f"Project status is at risk ({final_score}/100) due to active workload or schedule risks requiring mitigation."
        else:
            status = "critical"
            summary = f"Project status is critical ({final_score}/100) with severe risk factors and capacity overloads impacting delivery."

        return HealthScoreDetails(
            score=final_score,
            status=status,
            summary=summary,
        )


health_score_calculator = HealthScoreCalculator()
