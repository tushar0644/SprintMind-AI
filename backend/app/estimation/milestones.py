from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from app.estimation.schemas import SprintTimelineEntry, ProjectMilestone


class MilestoneGenerator:
    """
    Generates milestone release targets (MVP Completion, Beta, RC, Production Release)
    mapped to projected sprint completion dates and point progress thresholds.
    """

    def generate_milestones(
        self,
        sprint_entries: List[SprintTimelineEntry],
        project_start: datetime,
        project_finish: datetime,
    ) -> List[ProjectMilestone]:
        """
        Calculates release milestones based on sprint progression.
        """
        if not sprint_entries:
            # Fallback when no sprints have been planned yet
            mvp_date = project_start + timedelta(days=14)
            beta_date = project_start + timedelta(days=28)
            rc_date = project_finish - timedelta(days=7)
            prod_date = project_finish

            return [
                ProjectMilestone(
                    name="MVP Completion",
                    target_date=mvp_date,
                    sprint_number=1,
                    completion_percentage=40.0,
                    description="Core baseline capabilities and primary user flow functional.",
                ),
                ProjectMilestone(
                    name="Beta",
                    target_date=beta_date,
                    sprint_number=2,
                    completion_percentage=75.0,
                    description="Feature complete build ready for internal user acceptance testing.",
                ),
                ProjectMilestone(
                    name="RC",
                    target_date=rc_date,
                    sprint_number=3,
                    completion_percentage=90.0,
                    description="Hardened release candidate with zero high-priority blockers.",
                ),
                ProjectMilestone(
                    name="Production Release",
                    target_date=prod_date,
                    sprint_number=4,
                    completion_percentage=100.0,
                    description="General availability launch and production deployment.",
                ),
            ]

        total_points = sum(s.total_points for s in sprint_entries)
        total_sprints = len(sprint_entries)

        # Helper to find sprint matching target threshold
        def find_sprint_by_threshold(pct_threshold: float) -> SprintTimelineEntry:
            if total_points <= 0:
                # Fall back to sprint index based on ratio
                target_idx = min(
                    total_sprints - 1,
                    max(0, int(round((pct_threshold / 100.0) * total_sprints)) - 1),
                )
                return sprint_entries[target_idx]

            accumulated = 0
            for s in sprint_entries:
                accumulated += s.total_points
                if (accumulated / total_points) * 100.0 >= pct_threshold:
                    return s
            return sprint_entries[-1]

        # 1. MVP Completion (~40-50%)
        mvp_sprint = find_sprint_by_threshold(45.0)
        mvp_pts = sum(
            s.total_points
            for s in sprint_entries
            if s.sprint_number <= mvp_sprint.sprint_number
        )
        mvp_pct = (
            round((mvp_pts / total_points) * 100.0, 1) if total_points > 0 else 50.0
        )

        # 2. Beta (~75%)
        beta_sprint = find_sprint_by_threshold(75.0)
        beta_pts = sum(
            s.total_points
            for s in sprint_entries
            if s.sprint_number <= beta_sprint.sprint_number
        )
        beta_pct = (
            round((beta_pts / total_points) * 100.0, 1) if total_points > 0 else 75.0
        )

        # 3. RC (~90%)
        rc_sprint = find_sprint_by_threshold(90.0)
        rc_pts = sum(
            s.total_points
            for s in sprint_entries
            if s.sprint_number <= rc_sprint.sprint_number
        )
        rc_pct = (
            round((rc_pts / total_points) * 100.0, 1) if total_points > 0 else 90.0
        )

        # 4. Production Release (100% / final sprint)
        prod_sprint = sprint_entries[-1]

        milestones = [
            ProjectMilestone(
                name="MVP Completion",
                target_date=mvp_sprint.end_date,
                sprint_number=mvp_sprint.sprint_number,
                completion_percentage=mvp_pct,
                description="Core functional baseline delivered.",
            ),
            ProjectMilestone(
                name="Beta",
                target_date=beta_sprint.end_date,
                sprint_number=beta_sprint.sprint_number,
                completion_percentage=beta_pct,
                description="Full feature integration ready for stakeholder review.",
            ),
            ProjectMilestone(
                name="RC",
                target_date=rc_sprint.end_date,
                sprint_number=rc_sprint.sprint_number,
                completion_percentage=rc_pct,
                description="Release Candidate build finalized for production verification.",
            ),
            ProjectMilestone(
                name="Production Release",
                target_date=prod_sprint.end_date,
                sprint_number=prod_sprint.sprint_number,
                completion_percentage=100.0,
                description="Production deployment complete and live.",
            ),
        ]

        return milestones


milestone_generator = MilestoneGenerator()
