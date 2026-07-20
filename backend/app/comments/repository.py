from typing import List, Optional, Tuple, Dict
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database.client import supabase
from app.comments.schemas import CommentResponse, CommentReactionResponse

# In-memory mock databases for testing
_MOCK_COMMENTS_DB: List[Dict] = []
_MOCK_REACTIONS_DB: List[Dict] = []

MOCK_USER_ID = "dbd1fa6e-21ef-42f2-89b5-c0f2ee8cf09c"

class CommentRepository:
    def _is_mock_user(self, user_id: UUID) -> bool:
        return str(user_id) == MOCK_USER_ID

    def get_by_id(self, comment_id: UUID) -> Optional[CommentResponse]:
        comment_id_str = str(comment_id)
        # Search mock db
        for c in _MOCK_COMMENTS_DB:
            if c["id"] == comment_id_str:
                return self._build_mock_response(c)

        # Database query
        try:
            res = supabase.table("comments").select("*, user_profiles(display_name, avatar_url)").eq("id", comment_id_str).execute()
            if not res.data:
                return None
            
            raw_comment = res.data[0]
            reactions = self._fetch_reactions_for_comments([comment_id_str])
            return self._build_db_response(raw_comment, reactions.get(comment_id_str, []))
        except Exception:
            return None

    def list_comments_for_task(
        self, task_id: UUID, page: int = 1, limit: int = 20, user_id: Optional[UUID] = None
    ) -> Tuple[List[CommentResponse], int]:
        task_id_str = str(task_id)

        if user_id and self._is_mock_user(user_id):
            # Filtering root comments
            root_comments = [
                c for c in _MOCK_COMMENTS_DB
                if c["task_id"] == task_id_str and c["parent_id"] is None
            ]
            # Sort by created_at ascending
            root_comments = sorted(root_comments, key=lambda x: x["created_at"])
            total_count = len(root_comments)

            # Paginate root comments
            start = (page - 1) * limit
            end = start + limit
            paginated_roots = root_comments[start:end]

            # Build responses recursively
            results = []
            for rc in paginated_roots:
                res_obj = self._build_mock_response_tree(rc)
                results.append(res_obj)
            return results, total_count

        try:
            # 1. Fetch exact total count of root comments
            count_res = supabase.table("comments")\
                .select("id", count="exact")\
                .eq("task_id", task_id_str)\
                .is_("parent_id", "null")\
                .execute()
            total_count = count_res.count if count_res.count is not None else 0

            # 2. Fetch paginated root comments
            roots_res = supabase.table("comments")\
                .select("*, user_profiles(display_name, avatar_url)")\
                .eq("task_id", task_id_str)\
                .is_("parent_id", "null")\
                .order("created_at", desc=False)\
                .range((page - 1) * limit, page * limit - 1)\
                .execute()

            if not roots_res.data:
                return [], total_count

            root_comments = roots_res.data
            root_ids = [r["id"] for r in root_comments]

            # 3. Fetch replies recursively or in bulk (since it's a flat relation for comments on a task, we can grab all replies to this task)
            replies_res = supabase.table("comments")\
                .select("*, user_profiles(display_name, avatar_url)")\
                .eq("task_id", task_id_str)\
                .not_.is_("parent_id", "null")\
                .order("created_at", desc=False)\
                .execute()
            
            all_comments = root_comments + (replies_res.data or [])
            all_ids = [c["id"] for c in all_comments]

            # 4. Fetch reactions for these comments
            reactions_map = self._fetch_reactions_for_comments(all_ids)

            # 5. Build responses tree
            # Group comments by parent_id
            by_parent: Dict[str, List[dict]] = {}
            for c in all_comments:
                pid = c.get("parent_id")
                if pid:
                    by_parent.setdefault(pid, []).append(c)

            # Recursive builder helper
            def build_tree(comment_node: dict) -> CommentResponse:
                cid = comment_node["id"]
                node_reactions = reactions_map.get(cid, [])
                
                # Fetch direct children and sort by created_at
                children_raw = by_parent.get(cid, [])
                children_responses = [build_tree(child) for child in children_raw]
                
                return self._build_db_response(comment_node, node_reactions, children_responses)

            results = [build_tree(rc) for rc in root_comments]
            return results, total_count

        except Exception as e:
            print("Database query failed in list_comments_for_task:", e)
            return [], 0

    def create(
        self, user_id: UUID, task_id: UUID, content: str, parent_id: Optional[UUID] = None
    ) -> CommentResponse:
        user_id_str = str(user_id)
        task_id_str = str(task_id)
        parent_id_str = str(parent_id) if parent_id else None

        if self._is_mock_user(user_id):
            now = datetime.now(timezone.utc)
            new_comment = {
                "id": str(uuid4()),
                "task_id": task_id_str,
                "user_id": user_id_str,
                "parent_id": parent_id_str,
                "content": content,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
                # Mock joined data
                "display_name": "Mock User",
                "avatar_url": None
            }
            _MOCK_COMMENTS_DB.append(new_comment)
            return self._build_mock_response_tree(new_comment)

        # Database insert
        res = supabase.table("comments").insert({
            "task_id": task_id_str,
            "user_id": user_id_str,
            "parent_id": parent_id_str,
            "content": content
        }).execute()

        if not res.data:
            raise ValueError("Failed to create comment in database.")
        
        # Re-fetch with join to populate user profile
        created_id = res.data[0]["id"]
        full_comment = supabase.table("comments")\
            .select("*, user_profiles(display_name, avatar_url)")\
            .eq("id", created_id)\
            .execute()
        
        return self._build_db_response(full_comment.data[0], [])

    def update(self, comment_id: UUID, content: str) -> Optional[CommentResponse]:
        comment_id_str = str(comment_id)
        # Search mock db
        for c in _MOCK_COMMENTS_DB:
            if c["id"] == comment_id_str:
                if c["deleted_at"] is not None:
                    return None
                c["content"] = content
                c["updated_at"] = datetime.now(timezone.utc)
                return self._build_mock_response_tree(c)

        # Database update
        try:
            res = supabase.table("comments")\
                .update({"content": content, "updated_at": "now()"})\
                .eq("id", comment_id_str)\
                .execute()
            if not res.data:
                return None
            return self.get_by_id(comment_id)
        except Exception:
            return None

    def delete(self, comment_id: UUID) -> bool:
        comment_id_str = str(comment_id)
        now = datetime.now(timezone.utc)
        # Search mock db
        for c in _MOCK_COMMENTS_DB:
            if c["id"] == comment_id_str:
                c["deleted_at"] = now
                return True

        # Database update (soft-delete)
        try:
            res = supabase.table("comments")\
                .update({"deleted_at": "now()"})\
                .eq("id", comment_id_str)\
                .execute()
            return len(res.data) > 0
        except Exception:
            return False

    def toggle_reaction(self, comment_id: UUID, user_id: UUID, emoji: str) -> Dict[str, bool]:
        comment_id_str = str(comment_id)
        user_id_str = str(user_id)

        if self._is_mock_user(user_id):
            # Check existing
            for idx, r in enumerate(_MOCK_REACTIONS_DB):
                if r["comment_id"] == comment_id_str and r["user_id"] == user_id_str and r["emoji"] == emoji:
                    _MOCK_REACTIONS_DB.pop(idx)
                    return {"active": False}
            
            _MOCK_REACTIONS_DB.append({
                "comment_id": comment_id_str,
                "user_id": user_id_str,
                "emoji": emoji,
                "display_name": "Mock User"
            })
            return {"active": True}

        # Database reaction toggle
        try:
            # Check if reaction exists
            existing = supabase.table("comment_reactions")\
                .select("id")\
                .eq("comment_id", comment_id_str)\
                .eq("user_id", user_id_str)\
                .eq("emoji", emoji)\
                .execute()

            if existing.data:
                supabase.table("comment_reactions").delete().eq("id", existing.data[0]["id"]).execute()
                return {"active": False}
            else:
                supabase.table("comment_reactions").insert({
                    "comment_id": comment_id_str,
                    "user_id": user_id_str,
                    "emoji": emoji
                }).execute()
                return {"active": True}
        except Exception as e:
            raise ValueError(f"Failed to toggle reaction: {str(e)}")

    # Helper helpers
    def _fetch_reactions_for_comments(self, comment_ids: List[str]) -> Dict[str, List[CommentReactionResponse]]:
        if not comment_ids:
            return {}
        try:
            res = supabase.table("comment_reactions")\
                .select("*, user_profiles(display_name)")\
                .in_("comment_id", comment_ids)\
                .execute()

            result = {}
            for r in (res.data or []):
                cid = r["comment_id"]
                profile = r.get("user_profiles") or {}
                reaction_resp = CommentReactionResponse(
                    user_id=UUID(r["user_id"]),
                    emoji=r["emoji"],
                    user_display_name=profile.get("display_name")
                )
                result.setdefault(cid, []).append(reaction_resp)
            return result
        except Exception:
            return {}

    def _build_db_response(self, raw: dict, reactions: List[CommentReactionResponse], replies: List[CommentResponse] = None) -> CommentResponse:
        profile = raw.get("user_profiles") or {}
        deleted = raw.get("deleted_at") is not None

        content = "[Comment deleted]" if deleted else raw["content"]
        display_name = "Deleted User" if deleted else (profile.get("display_name") or "User")
        avatar_url = None if deleted else profile.get("avatar_url")

        return CommentResponse(
            id=UUID(raw["id"]),
            task_id=UUID(raw["task_id"]),
            user_id=UUID(raw["user_id"]),
            parent_id=UUID(raw["parent_id"]) if raw.get("parent_id") else None,
            content=content,
            created_at=datetime.fromisoformat(raw["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(raw["updated_at"].replace("Z", "+00:00")),
            deleted_at=datetime.fromisoformat(raw["deleted_at"].replace("Z", "+00:00")) if raw.get("deleted_at") else None,
            user_display_name=display_name,
            user_avatar_url=avatar_url,
            reactions=reactions,
            replies=replies or []
        )

    def _build_mock_response(self, raw: dict, replies: List[CommentResponse] = None) -> CommentResponse:
        deleted = raw.get("deleted_at") is not None
        content = "[Comment deleted]" if deleted else raw["content"]
        display_name = "Deleted User" if deleted else raw.get("display_name", "Mock User")
        avatar_url = None if deleted else raw.get("avatar_url")

        # Fetch mock reactions
        comment_reactions = []
        for r in _MOCK_REACTIONS_DB:
            if r["comment_id"] == raw["id"]:
                comment_reactions.append(CommentReactionResponse(
                    user_id=UUID(r["user_id"]),
                    emoji=r["emoji"],
                    user_display_name=r.get("display_name", "Mock User")
                ))

        created_val = raw["created_at"]
        updated_val = raw["updated_at"]
        deleted_val = raw["deleted_at"]

        return CommentResponse(
            id=UUID(raw["id"]),
            task_id=UUID(raw["task_id"]),
            user_id=UUID(raw["user_id"]),
            parent_id=UUID(raw["parent_id"]) if raw.get("parent_id") else None,
            content=content,
            created_at=created_val if isinstance(created_val, datetime) else datetime.fromisoformat(created_val),
            updated_at=updated_val if isinstance(updated_val, datetime) else datetime.fromisoformat(updated_val),
            deleted_at=deleted_val if (not deleted_val or isinstance(deleted_val, datetime)) else datetime.fromisoformat(deleted_val),
            user_display_name=display_name,
            user_avatar_url=avatar_url,
            reactions=comment_reactions,
            replies=replies or []
        )

    def _build_mock_response_tree(self, raw: dict) -> CommentResponse:
        # Find children
        children = [c for c in _MOCK_COMMENTS_DB if c["parent_id"] == raw["id"]]
        # Sort children by created_at ascending
        children = sorted(children, key=lambda x: x["created_at"])
        replies_objs = [self._build_mock_response_tree(c) for c in children]
        return self._build_mock_response(raw, replies_objs)
