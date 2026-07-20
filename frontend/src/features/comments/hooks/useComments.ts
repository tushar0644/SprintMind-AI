import { useState, useEffect, useCallback, useRef } from "react";
import { Comment, CommentReaction } from "../types";
import { commentsService } from "../services/commentsService";
import { useAuthStore } from "../../../store/authStore";
import { useRealtime } from "../../../hooks/useRealtime";

const parseErrorMessage = (err: any, fallback: string): string => {
  const detail = err.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        const path = e.loc ? e.loc.join(".") : "";
        return `${path ? path + ": " : ""}${e.msg || JSON.stringify(e)}`;
      })
      .join("; ");
  }
  if (typeof detail === "object") {
    return detail.message || JSON.stringify(detail);
  }
  return fallback;
};

export const useComments = (taskId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const pageRef = useRef<number>(1);
  const fetchIdRef = useRef<number>(0);
  const limit = 10;

  const fetchComments = useCallback(async (pageToFetch: number, isLoadMore = false) => {
    const fetchId = ++fetchIdRef.current;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await commentsService.getComments(taskId, pageToFetch, limit);
      if (fetchId !== fetchIdRef.current) return;
      
      setComments((prev) => {
        if (isLoadMore) {
          // Merge root comments, avoiding duplicates
          const existingIds = new Set(prev.map((c) => c.id));
          const newRoots = res.comments.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newRoots];
        } else {
          return res.comments;
        }
      });
      
      setHasMore(comments.length + res.comments.length < res.total_count);
      pageRef.current = pageToFetch;
    } catch (err: any) {
      setError(parseErrorMessage(err, "Failed to load comments."));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [taskId]);

  useEffect(() => {
    pageRef.current = 1;
    setComments([]);
    setHasMore(false);
    if (taskId) {
      fetchComments(1, false);
    }
  }, [taskId, fetchComments]);

  useRealtime({
    channelName: `task_comments:${taskId}`,
    postgres: [
      {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `task_id=eq.${taskId}`,
        callback: (payload) => {
          const currentUserId = useAuthStore.getState().session?.user?.id;
          
          // Only refresh if the event is from another user, to prevent overriding our optimistic updates
          // DELETE events might not have payload.new, so we check for DELETE explicitly
          if (payload.eventType === 'DELETE' || payload.new?.user_id !== currentUserId) {
            fetchComments(1, false);
          }
        }
      }
    ]
  });

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchComments(pageRef.current + 1, true);
    }
  }, [loading, loadingMore, hasMore, fetchComments]);

  // Recursively helper to update comments list
  const updateCommentInTree = (
    list: Comment[],
    commentId: string,
    updater: (c: Comment) => Comment
  ): Comment[] => {
    return list.map((c) => {
      if (c.id === commentId) {
        return updater(c);
      }
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: updateCommentInTree(c.replies, commentId, updater)
        };
      }
      return c;
    });
  };

  // Recursively helper to remove a comment from tree (e.g. if optimistic insert fails)
  const removeCommentFromTree = (list: Comment[], commentId: string): Comment[] => {
    return list
      .filter((c) => c.id !== commentId)
      .map((c) => {
        if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: removeCommentFromTree(c.replies, commentId)
          };
        }
        return c;
      });
  };

  // Helper to add a nested reply in the tree
  const addReplyToTree = (list: Comment[], parentId: string, newReply: Comment): Comment[] => {
    return list.map((c) => {
      if (c.id === parentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: addReplyToTree(c.replies, parentId, newReply)
        };
      }
      return c;
    });
  };

  const createComment = async (content: string, parentId?: string | null) => {
    if (!content.trim()) return;
    setError(null);
    fetchIdRef.current++; // Invalidate any in-flight GET requests immediately

    const tempId = `temp-${Date.now()}`;
    const nowStr = new Date().toISOString();
    const currentUserId = session?.user?.id || "mock-user-id";

    // Build optimistic comment object
    const optimisticComment: Comment = {
      id: tempId,
      task_id: taskId,
      user_id: currentUserId,
      parent_id: parentId || null,
      content: content.trim(),
      created_at: nowStr,
      updated_at: nowStr,
      deleted_at: null,
      user_display_name: profile?.display_name || session?.user?.email?.split("@")[0] || "You",
      user_avatar_url: profile?.avatar_url || undefined,
      reactions: [],
      replies: []
    };

    // Update UI state immediately
    setComments((prev) => {
      if (parentId) {
        return addReplyToTree(prev, parentId, optimisticComment);
      } else {
        return [optimisticComment, ...prev];
      }
    });

    try {
      const realComment = await commentsService.createComment({
        task_id: taskId,
        content: content.trim(),
        parent_id: parentId || null
      });
      
      // Replace optimistic comment with the real one in state
      setComments((prev) => {
        if (parentId) {
          const removed = removeCommentFromTree(prev, tempId);
          return addReplyToTree(removed, parentId, realComment);
        } else {
          return prev.map((c) => (c.id === tempId ? realComment : c));
        }
      });
    } catch (err: any) {
      // Rollback on failure
      setComments((prev) => removeCommentFromTree(prev, tempId));
      setError(parseErrorMessage(err, "Failed to post comment."));
      throw err;
    }
  };

  const editComment = async (commentId: string, content: string) => {
    if (!content.trim()) return;
    setError(null);

    let originalComment: Comment | null = null;
    
    // Find the original comment to allow rollback
    const findComment = (list: Comment[]): boolean => {
      for (const c of list) {
        if (c.id === commentId) {
          originalComment = { ...c };
          return true;
        }
        if (c.replies && findComment(c.replies)) return true;
      }
      return false;
    };
    findComment(comments);

    // Apply optimistic update
    setComments((prev) =>
      updateCommentInTree(prev, commentId, (c) => ({
        ...c,
        content: content.trim(),
        updated_at: new Date().toISOString()
      }))
    );

    try {
      const updatedComment = await commentsService.updateComment(commentId, {
        content: content.trim()
      });
      // Sync real response
      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({
          ...updatedComment,
          replies: c.replies
        }))
      );
    } catch (err: any) {
      // Rollback on failure
      if (originalComment) {
        setComments((prev) =>
          updateCommentInTree(prev, commentId, () => originalComment!)
        );
      }
      setError(parseErrorMessage(err, "Failed to update comment."));
      throw err;
    }
  };

  const deleteComment = async (commentId: string) => {
    setError(null);
    let originalComment: Comment | null = null;

    const findComment = (list: Comment[]): boolean => {
      for (const c of list) {
        if (c.id === commentId) {
          originalComment = { ...c };
          return true;
        }
        if (c.replies && findComment(c.replies)) return true;
      }
      return false;
    };
    findComment(comments);

    // Apply optimistic soft-delete styling mask
    setComments((prev) =>
      updateCommentInTree(prev, commentId, (c) => ({
        ...c,
        content: "[Comment deleted]",
        user_display_name: "Deleted User",
        user_avatar_url: undefined,
        deleted_at: new Date().toISOString()
      }))
    );

    try {
      await commentsService.deleteComment(commentId);
      // Wait for complete refresh or just keep the soft-delete mask.
      // Soft-delete mask is already perfect, but we can do a fetch for latest state.
    } catch (err: any) {
      // Rollback on failure
      if (originalComment) {
        setComments((prev) =>
          updateCommentInTree(prev, commentId, () => originalComment!)
        );
      }
      setError(parseErrorMessage(err, "Failed to delete comment."));
      throw err;
    }
  };

  const toggleReaction = async (commentId: string, emoji: string) => {
    setError(null);
    const currentUserId = session?.user?.id || "mock-user-id";
    const currentUserDisplayName = profile?.display_name || session?.user?.email?.split("@")[0] || "You";

    let originalReactions: CommentReaction[] = [];

    // Find original reactions to allow rollback
    const findComment = (list: Comment[]): boolean => {
      for (const c of list) {
        if (c.id === commentId) {
          originalReactions = [...c.reactions];
          return true;
        }
        if (c.replies && findComment(c.replies)) return true;
      }
      return false;
    };
    findComment(comments);

    // Apply optimistic update on reactions
    setComments((prev) =>
      updateCommentInTree(prev, commentId, (c) => {
        const hasReacted = c.reactions.some(
          (r) => r.user_id === currentUserId && r.emoji === emoji
        );
        let newReactions = [];
        if (hasReacted) {
          newReactions = c.reactions.filter(
            (r) => !(r.user_id === currentUserId && r.emoji === emoji)
          );
        } else {
          newReactions = [
            ...c.reactions,
            {
              user_id: currentUserId,
              emoji: emoji,
              user_display_name: currentUserDisplayName
            }
          ];
        }
        return {
          ...c,
          reactions: newReactions
        };
      })
    );

    try {
      await commentsService.toggleReaction(commentId, emoji);
    } catch (err: any) {
      // Rollback on failure
      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({
          ...c,
          reactions: originalReactions
        }))
      );
      setError(parseErrorMessage(err, "Failed to update reaction."));
      throw err;
    }
  };

  return {
    comments,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    createComment,
    editComment,
    deleteComment,
    toggleReaction,
    refresh: () => fetchComments(1, false)
  };
};
