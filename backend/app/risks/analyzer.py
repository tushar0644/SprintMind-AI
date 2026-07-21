from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.tasks.repository import TaskRepository
from app.sprints.repository import SprintRepository, sprint_repository
from app.estimation.estimator import ProjectEstimator, project_estimator
from app.risks.dependency import DependencyRiskEngine, dependency_risk_engine
from app.risks.workload import WorkloadRiskEngine, workload_risk_engine
from app.risks.schedule import ScheduleRiskEngine, schedule_risk_engine
from app.risks.repository import RiskRepository, risk_repository
from app.risks.schemas import RiskItem, RiskAnalysisResponse


class RiskAnalyzer:
    """
    Unified AI Risk Analysis Engine combining dependency, workload, and schedule
    analysis into actionable risk alerts and recommendations.
    """

    def __init__(
        self,
        task_repo: Optional[TaskRepository] = None,
        sprint_repo: Optional[SprintRepository] = None,
        estimator: Optional[ProjectEstimator] = None,
        dep_engine: Optional[DependencyRiskEngine] = None,
        workload_engine: Optional[WorkloadRiskEngine] = None,
        schedule_engine: Optional[ScheduleRiskEngine] = None,
        risk_repo: Optional[RiskRepository] = None,
    ):
        self.task_repo = task_repo or TaskRepository()
        self.sprint_repo = sprint_repo or sprint_repository
        self.estimator = estimator or project_estimator
        self.dep_engine = dep_engine or dependency_risk_engine
        self.workload_engine = workload_engine or workload_risk_engine
        self.schedule_engine = schedule_engine or schedule_risk_engine
        self.risk_repo = risk_repo or risk_repository

    def analyze_project(
        self,
        owner_id: UUID,
        project_id: UUID,
    ) -> RiskAnalysisResponse:
        """
        Executes comprehensive risk analysis for a project across all risk engines.
        """
        owner_id = UUID(str(owner_id))
        project_id = UUID(str(project_id))

        # 1. Fetch data inputs
        tasks, _ = self.task_repo.list_tasks(owner_id=owner_id, project_id=project_id)
        sprints = self.sprint_repo.get_by_project(project_id, owner_id)
        timeline = self.estimator.get_timeline(owner_id=owner_id, project_id=project_id)

        all_risks: List[RiskItem] = []

        # 2. Run Dependency Analysis
        dep_risks = self.dep_engine.analyze(tasks=tasks, sprints=sprints)
        all_risks.extend(dep_risks)

        # 3. Run Workload Analysis
        workload_risks = self.workload_engine.analyze(sprints=sprints, tasks=tasks)
        all_risks.extend(workload_risks)

        # 4. Run Schedule Analysis
        schedule_risks = self.schedule_engine.analyze(timeline_data=timeline.model_dump())
        all_risks.extend(schedule_risks)

        # Sort risks by severity importance: critical -> high -> medium -> low
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        all_risks.sort(key=lambda r: severity_order.get(r.severity, 4))

        # 5. Persist analysis results
        dict_risks = [r.model_dump() for r in all_risks]
        saved_records = self.risk_repo.replace_project_risks(project_id, owner_id, dict_risks)

        # Convert saved records to RiskItem objects
        formatted_risks = [RiskItem.model_validate(r) for r in saved_records]

        # Count severities
        crit_count = sum(1 for r in formatted_risks if r.severity == "critical")
        high_count = sum(1 for r in formatted_risks if r.severity == "high")
        med_count = sum(1 for r in formatted_risks if r.severity == "medium")
        low_count = sum(1 for r in formatted_risks if r.severity == "low")

        return RiskAnalysisResponse(
            project_id=project_id,
            total_risks=len(formatted_risks),
            critical_risks_count=crit_count,
            high_risks_count=high_count,
            medium_risks_count=med_count,
            low_risks_count=low_count,
            risks=formatted_risks,
            analyzed_at=datetime.now(timezone.utc),
        )

    def get_project_risks(
        self,
        owner_id: UUID,
        project_id: UUID,
    ) -> RiskAnalysisResponse:
        """
        Retrieves existing project risks from repository, or performs analysis if none exist.
        """
        owner_id = UUID(str(owner_id))
        project_id = UUID(str(project_id))

        existing = self.risk_repo.get_by_project(project_id, owner_id)
        if not existing:
            return self.analyze_project(owner_id, project_id)

        formatted_risks = [RiskItem.model_validate(r) for r in existing]

        crit_count = sum(1 for r in formatted_risks if r.severity == "critical")
        high_count = sum(1 for r in formatted_risks if r.severity == "high")
        med_count = sum(1 for r in formatted_risks if r.severity == "medium")
        low_count = sum(1 for r in formatted_risks if r.severity == "low")

        return RiskAnalysisResponse(
            project_id=project_id,
            total_risks=len(formatted_risks),
            critical_risks_count=crit_count,
            high_risks_count=high_count,
            medium_risks_count=med_count,
            low_risks_count=low_count,
            risks=formatted_risks,
            analyzed_at=datetime.now(timezone.utc),
        )


risk_analyzer = RiskAnalyzer()
