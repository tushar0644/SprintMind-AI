from typing import List, Dict, Any, Union
import statistics


class VelocityCalculator:
    """
    Calculates team average sprint velocity, supports configurable sprint durations,
    and computes forecast confidence scores based on sprint history and point variance.
    """

    def calculate_velocity(
        self,
        sprints: List[Union[Dict[str, Any], Any]],
        sprint_duration_days: int = 14,
        default_capacity: int = 20,
    ) -> float:
        """
        Calculates average velocity (story points per sprint).
        Priority order:
        1. Average points of completed sprints (if any exist).
        2. Average total_points of planned sprints.
        3. Default capacity fallback.
        """
        if not sprints:
            return float(default_capacity)

        # Helper to extract dict or object field
        def get_val(sprint: Any, key: str, default: Any = 0):
            if isinstance(sprint, dict):
                return sprint.get(key, default)
            return getattr(sprint, key, default)

        completed_points = []
        planned_points = []

        for sprint in sprints:
            status = str(get_val(sprint, "status", "planned")).lower()
            pts = int(get_val(sprint, "total_points", 0))

            if status == "completed":
                # Calculate completed tasks points if available, otherwise total_points
                tasks = get_val(sprint, "tasks", [])
                if tasks:
                    done_pts = sum(
                        int(t.get("story_points", 1) if isinstance(t, dict) else getattr(t, "story_points", 1) or 1)
                        for t in tasks
                        if (t.get("status") if isinstance(t, dict) else getattr(t, "status", "")) == "done"
                    )
                    completed_points.append(done_pts if done_pts > 0 else pts)
                else:
                    completed_points.append(pts)
            elif pts > 0:
                planned_points.append(pts)

        if completed_points:
            return round(float(sum(completed_points) / len(completed_points)), 2)

        if planned_points:
            return round(float(sum(planned_points) / len(planned_points)), 2)

        # Fallback to capacity of first sprint or default_capacity
        first_capacity = get_val(sprints[0], "capacity", default_capacity)
        return float(first_capacity or default_capacity)

    def calculate_confidence(
        self,
        sprints: List[Union[Dict[str, Any], Any]],
        average_velocity: float,
        tasks_unscheduled: int = 0,
    ) -> float:
        """
        Computes estimation confidence score between 0.50 and 0.95 based on:
        - Number of sprints planned / completed.
        - Point consistency across sprints.
        - Presence of unscheduled/unresolved task dependencies.
        """
        if not sprints:
            return 0.70

        base_confidence = 0.85

        def get_val(sprint: Any, key: str, default: Any = 0):
            if isinstance(sprint, dict):
                return sprint.get(key, default)
            return getattr(sprint, key, default)

        completed_count = sum(
            1 for s in sprints if str(get_val(s, "status", "")).lower() == "completed"
        )

        # Boost for empirical completed sprint history
        if completed_count > 0:
            base_confidence += min(0.08, completed_count * 0.03)

        # Penalty for high variance across planned sprint point loads
        points_list = [int(get_val(s, "total_points", 0)) for s in sprints if get_val(s, "total_points", 0) > 0]
        if len(points_list) > 1:
            try:
                stdev = statistics.stdev(points_list)
                mean = statistics.mean(points_list)
                cv = stdev / mean if mean > 0 else 0
                if cv > 0.3:
                    base_confidence -= 0.05
            except Exception:
                pass

        # Penalty for unscheduled tasks
        if tasks_unscheduled > 0:
            base_confidence -= min(0.10, tasks_unscheduled * 0.02)

        # Clamp between 0.50 and 0.95
        return round(max(0.50, min(0.95, base_confidence)), 2)

    def validate_duration(self, sprint_duration_days: int) -> int:
        """
        Validates sprint duration parameter, defaulting to 14 days (2 weeks).
        """
        if not sprint_duration_days or sprint_duration_days <= 0:
            return 14
        return sprint_duration_days


velocity_calculator = VelocityCalculator()
