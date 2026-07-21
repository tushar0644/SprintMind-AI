from typing import List, Dict, Any, Union, Tuple
from app.dashboard.schemas import SprintProgressSummary, CapacitySummary


class MetricsCalculator:
    """
    Computes dashboard metric aggregations across tasks, sprint progress, and capacity loads.
    """

    def compute_task_metrics(
        self,
        tasks: List[Union[Dict[str, Any], Any]],
    ) -> Tuple[int, int, int]:
        """
        Returns (completed_tasks, remaining_tasks, total_tasks)
        """
        if not tasks:
            return 0, 0, 0

        def get_val(item: Any, key: str, default: Any = None):
            if isinstance(item, dict):
                return item.get(key, default)
            return getattr(item, key, default)

        total_tasks = len(tasks)
        completed_tasks = sum(
            1 for t in tasks if str(get_val(t, "status", "")).lower() == "done"
        )
        remaining_tasks = total_tasks - completed_tasks

        return completed_tasks, remaining_tasks, total_tasks

    def compute_sprint_progress(
        self,
        sprints: List[Union[Dict[str, Any], Any]],
    ) -> SprintProgressSummary:
        """
        Computes overall sprint progress summary.
        """
        if not sprints:
            return SprintProgressSummary(
                total_sprints=0,
                active_sprint=None,
                completion_percentage=0.0,
                total_points=0,
                completed_points=0,
            )

        def get_val(item: Any, key: str, default: Any = None):
            if isinstance(item, dict):
                return item.get(key, default)
            return getattr(item, key, default)

        total_sprints = len(sprints)
        active_sprint = None

        for s in sprints:
            status = str(get_val(s, "status", "planned")).lower()
            num = int(get_val(s, "sprint_number", 1))
            if status == "active" and active_sprint is None:
                active_sprint = num

        total_pts = sum(int(get_val(s, "total_points", 0)) for s in sprints)

        # Compute completed points across sprints
        completed_pts = 0
        for s in sprints:
            status = str(get_val(s, "status", "planned")).lower()
            pts = int(get_val(s, "total_points", 0))
            if status == "completed":
                completed_pts += pts

        completion_pct = (
            round((completed_pts / total_pts) * 100.0, 1) if total_pts > 0 else 0.0
        )

        return SprintProgressSummary(
            total_sprints=total_sprints,
            active_sprint=active_sprint or 1,
            completion_percentage=completion_pct,
            total_points=total_pts,
            completed_points=completed_pts,
        )

    def compute_capacity_summary(
        self,
        sprints: List[Union[Dict[str, Any], Any]],
    ) -> CapacitySummary:
        """
        Computes team capacity utilization metrics.
        """
        if not sprints:
            return CapacitySummary(
                average_capacity=20.0,
                total_points=0,
                capacity_utilization=0.0,
                overloaded_sprints_count=0,
            )

        def get_val(item: Any, key: str, default: Any = None):
            if isinstance(item, dict):
                return item.get(key, default)
            return getattr(item, key, default)

        total_cap = sum(int(get_val(s, "capacity", 20)) for s in sprints)
        total_pts = sum(int(get_val(s, "total_points", 0)) for s in sprints)

        avg_cap = round(float(total_cap / len(sprints)), 1)
        utilization = (
            round((total_pts / total_cap) * 100.0, 1) if total_cap > 0 else 0.0
        )

        overloaded_count = sum(
            1 for s in sprints if int(get_val(s, "total_points", 0)) > int(get_val(s, "capacity", 20))
        )

        return CapacitySummary(
            average_capacity=avg_cap,
            total_points=total_pts,
            capacity_utilization=utilization,
            overloaded_sprints_count=overloaded_count,
        )


metrics_calculator = MetricsCalculator()
