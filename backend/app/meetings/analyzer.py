from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.meetings.summarizer import MeetingSummarizer, meeting_summarizer
from app.meetings.extractor import MeetingExtractor, meeting_extractor
from app.meetings.task_mapper import MeetingTaskMapper, meeting_task_mapper
from app.meetings.repository import MeetingRepository, meeting_repository
from app.meetings.schemas import (
    MeetingAnalyzeRequest,
    MeetingResponse,
    ActionItemSchema,
    DecisionSchema,
    BlockerSchema,
    MeetingRiskSchema,
)


class MeetingAnalyzer:
    """
    Coordinates meeting summarization, information extraction, task mapping,
    recommendation generation, and meeting record persistence.
    """

    def __init__(
        self,
        summarizer: Optional[MeetingSummarizer] = None,
        extractor: Optional[MeetingExtractor] = None,
        task_mapper: Optional[MeetingTaskMapper] = None,
        repository: Optional[MeetingRepository] = None,
    ):
        self.summarizer = summarizer or meeting_summarizer
        self.extractor = extractor or meeting_extractor
        self.task_mapper = task_mapper or meeting_task_mapper
        self.repository = repository or meeting_repository

    def analyze_meeting(
        self,
        owner_id: UUID,
        project_id: UUID,
        request: MeetingAnalyzeRequest,
    ) -> MeetingResponse:
        """
        Processes meeting title and notes, generates summary, extracts action items/decisions/blockers/risks,
        maps tasks, generates deterministic recommendations, and saves result.
        """
        owner_id = UUID(str(owner_id))
        project_id = UUID(str(project_id))

        # 1. Generate Summary
        summary = self.summarizer.summarize(request.title, request.notes)

        # 2. Extract Entities
        action_items, decisions, blockers, risks = self.extractor.extract_all(request.notes)

        # 3. Map Tasks
        mapped_action_items, task_mappings = self.task_mapper.map_action_items_to_tasks(
            owner_id=owner_id,
            project_id=project_id,
            action_items=action_items,
        )

        # 4. Generate Deterministic Recommendations
        recommendations = self._generate_recommendations(
            action_items=mapped_action_items,
            blockers=blockers,
            risks=risks,
            notes=request.notes,
        )

        meeting_id = uuid4()
        response = MeetingResponse(
            id=meeting_id,
            project_id=project_id,
            owner_id=owner_id,
            title=request.title,
            notes=request.notes,
            summary=summary,
            action_items=mapped_action_items,
            decisions=decisions,
            blockers=blockers,
            risks=risks,
            task_mappings=task_mappings,
            recommendations=recommendations,
            created_at=datetime.now(timezone.utc),
        )

        # 5. Save Meeting Analysis Record
        self.repository.create_meeting(response)

        return response

    def _generate_recommendations(
        self,
        action_items: List[ActionItemSchema],
        blockers: List[BlockerSchema],
        risks: List[MeetingRiskSchema],
        notes: str,
    ) -> List[str]:
        """
        Generates deterministic recommendations:
        - Update Sprint
        - Split Task
        - Increase Capacity
        - Schedule Follow-up
        - Resolve Dependency
        """
        recs: List[str] = []
        notes_lower = notes.lower()

        # Rule 1: Update Sprint
        if any(ai.is_suggested_new for ai in action_items) or "sprint" in notes_lower or "scope" in notes_lower:
            recs.append("Update Sprint planning board to incorporate newly identified action items.")

        # Rule 2: Split Task
        if any(ai.story_points and ai.story_points >= 8 for ai in action_items) or "large task" in notes_lower or "complex" in notes_lower:
            recs.append("Split Task: Break down large or complex meeting outcomes into smaller user stories.")

        # Rule 3: Increase Capacity
        if len(action_items) >= 4 or "overloaded" in notes_lower or "capacity" in notes_lower:
            recs.append("Increase Capacity or reallocate team resources to accommodate added backlog deliverables.")

        # Rule 4: Schedule Follow-up
        if blockers or any(r.severity in ("high", "critical") for r in risks) or "follow up" in notes_lower:
            recs.append("Schedule Follow-up meeting to review open blockers and high-severity risk items.")

        # Rule 5: Resolve Dependency
        if blockers or any(r.category == "dependency" for r in risks) or "prerequisite" in notes_lower:
            recs.append("Resolve Dependency bottlenecks between prerequisite tasks before current sprint execution.")

        if not recs:
            recs.append("Update Sprint board with agreed meeting action items.")

        return recs


meeting_analyzer = MeetingAnalyzer()
