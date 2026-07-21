from typing import List, Dict, Any, Tuple, Optional
from uuid import UUID

from app.tasks.repository import TaskRepository
from app.meetings.schemas import ActionItemSchema, TaskMapResultSchema


class MeetingTaskMapper:
    """
    Compares meeting action items against existing project tasks.
    Returns whether each action item maps to a 'Matched Task' or is a 'Suggested New Task'.
    """

    def __init__(self, task_repo: Optional[TaskRepository] = None):
        self.task_repo = task_repo or TaskRepository()

    def map_action_items_to_tasks(
        self,
        owner_id: UUID,
        project_id: UUID,
        action_items: List[ActionItemSchema],
    ) -> Tuple[List[ActionItemSchema], List[TaskMapResultSchema]]:
        """
        Maps action items to existing project tasks using keyword/title similarity.
        Mutates action_items to set matched_task_id and is_suggested_new.
        """
        owner_id = UUID(str(owner_id))
        project_id = UUID(str(project_id))

        existing_tasks, _ = self.task_repo.list_tasks(owner_id=owner_id, project_id=project_id)
        task_mappings: List[TaskMapResultSchema] = []

        for item in action_items:
            best_match = None
            best_score = 0.0

            item_words = set(re_words(item.title))

            for task in existing_tasks:
                task_title = getattr(task, "title", "") if not isinstance(task, dict) else task.get("title", "")
                t_words = set(re_words(task_title))

                if not item_words or not t_words:
                    continue

                common = item_words.intersection(t_words)
                score = len(common) / max(len(item_words), 1)

                if score > best_score:
                    best_score = score
                    best_match = task

            if best_match and best_score >= 0.40:
                m_id = getattr(best_match, "id", None) if not isinstance(best_match, dict) else best_match.get("id")
                m_title = getattr(best_match, "title", "") if not isinstance(best_match, dict) else best_match.get("title", "")

                item.matched_task_id = UUID(str(m_id)) if m_id else None
                item.is_suggested_new = False

                task_mappings.append(
                    TaskMapResultSchema(
                        action_item_title=item.title,
                        status="matched",
                        matched_task_id=UUID(str(m_id)) if m_id else None,
                        matched_task_title=m_title,
                        confidence=round(best_score, 2),
                    )
                )
            else:
                item.matched_task_id = None
                item.is_suggested_new = True

                task_mappings.append(
                    TaskMapResultSchema(
                        action_item_title=item.title,
                        status="suggested_new",
                        matched_task_id=None,
                        matched_task_title=None,
                        confidence=1.0,
                    )
                )

        return action_items, task_mappings


def re_words(text: str) -> List[str]:
    import re
    return [w.lower() for w in re.findall(r"\w+", text) if len(w) > 2]


meeting_task_mapper = MeetingTaskMapper()
