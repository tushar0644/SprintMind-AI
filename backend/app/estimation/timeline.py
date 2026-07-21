from typing import List, Dict, Any, Union, Optional, Tuple
from datetime import datetime, timedelta, timezone
from app.estimation.schemas import SprintTimelineEntry


class TimelinePredictor:
    """
    Predicts sprint start and end completion dates and calculates overall project
    estimated delivery timelines based on sprint schedules and duration settings.
    """

    def predict_timeline(
        self,
        sprints: List[Union[Dict[str, Any], Any]],
        start_date: Optional[datetime] = None,
        sprint_duration_days: int = 14,
    ) -> Tuple[datetime, datetime, int, List[SprintTimelineEntry]]:
        """
        Calculates predicted start and completion dates for all sprints in sequence.

        Returns:
            (project_start, project_finish, total_duration_days, sprint_dates)
        """
        if not start_date:
            start_date = datetime.now(timezone.utc)
        elif start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)

        duration = max(1, sprint_duration_days)

        if not sprints:
            project_start = start_date
            project_finish = start_date + timedelta(days=duration)
            total_duration_days = (project_finish - project_start).days
            return project_start, project_finish, total_duration_days, []

        def get_val(sprint: Any, key: str, default: Any = 0):
            if isinstance(sprint, dict):
                return sprint.get(key, default)
            return getattr(sprint, key, default)

        sorted_sprints = sorted(sprints, key=lambda s: int(get_val(s, "sprint_number", 1)))

        sprint_entries: List[SprintTimelineEntry] = []
        current_start = start_date

        for s in sorted_sprints:
            num = int(get_val(s, "sprint_number", 1))
            name = str(get_val(s, "name", f"Sprint {num}"))
            pts = int(get_val(s, "total_points", 0))
            tasks = get_val(s, "tasks", [])
            task_count = len(tasks) if isinstance(tasks, list) else 0
            status = str(get_val(s, "status", "planned"))
            s_id = get_val(s, "id", None)

            sprint_end = current_start + timedelta(days=duration)

            sprint_entries.append(
                SprintTimelineEntry(
                    sprint_id=s_id,
                    sprint_number=num,
                    name=name,
                    start_date=current_start,
                    end_date=sprint_end,
                    duration_days=duration,
                    total_points=pts,
                    task_count=task_count,
                    status=status,
                )
            )

            current_start = sprint_end

        project_start = sprint_entries[0].start_date
        project_finish = sprint_entries[-1].end_date
        total_duration_days = (project_finish - project_start).days

        return project_start, project_finish, total_duration_days, sprint_entries


timeline_predictor = TimelinePredictor()
