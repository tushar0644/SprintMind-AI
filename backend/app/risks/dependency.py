from typing import List, Dict, Any, Union, Set
from app.risks.schemas import RiskItem


class DependencyRiskEngine:
    """
    Analyzes task dependencies to detect circular dependencies, dependency bottlenecks,
    blocked out-of-order tasks, and long sequential dependency chains.
    """

    def analyze(
        self,
        tasks: List[Union[Dict[str, Any], Any]],
        sprints: List[Union[Dict[str, Any], Any]] = None,
    ) -> List[RiskItem]:
        risks: List[RiskItem] = []
        if not tasks:
            return risks

        sprints = sprints or []

        def get_val(item: Any, key: str, default: Any = None):
            if isinstance(item, dict):
                return item.get(key, default)
            return getattr(item, key, default)

        # Build task mappings
        task_by_id: Dict[str, Any] = {}
        for t in tasks:
            t_id = str(get_val(t, "id", ""))
            if t_id:
                task_by_id[t_id] = t

        # Map sprint_id -> sprint_number
        sprint_number_map: Dict[str, int] = {}
        for s in sprints:
            s_id = str(get_val(s, "id", ""))
            num = int(get_val(s, "sprint_number", 1))
            if s_id:
                sprint_number_map[s_id] = num

        # 1. Circular Dependencies Detection
        cycle_risks = self._detect_circular_dependencies(tasks, task_by_id, get_val)
        risks.extend(cycle_risks)

        # 2. Dependency Bottlenecks Detection
        bottleneck_risks = self._detect_bottlenecks(tasks, task_by_id, get_val)
        risks.extend(bottleneck_risks)

        # 3. Blocked / Out-of-Order Scheduled Tasks
        blocked_risks = self._detect_blocked_tasks(tasks, task_by_id, sprint_number_map, get_val)
        risks.extend(blocked_risks)

        # 4. Long Dependency Chains
        chain_risks = self._detect_dependency_chains(tasks, task_by_id, get_val)
        risks.extend(chain_risks)

        return risks

    def _detect_circular_dependencies(self, tasks, task_by_id, get_val) -> List[RiskItem]:
        risks = []
        visited = set()
        rec_stack = set()
        cycles_found = []

        adj = {}
        for t in tasks:
            t_id = str(get_val(t, "id", ""))
            deps = get_val(t, "depends_on", []) or []
            adj[t_id] = [str(d) for d in deps if str(d) in task_by_id]

        def dfs(node, path):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in adj.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor, path)
                elif neighbor in rec_stack:
                    # Cycle detected
                    cycle_start_idx = path.index(neighbor)
                    cycle_nodes = path[cycle_start_idx:]
                    cycles_found.append(cycle_nodes)

            path.pop()
            rec_stack.remove(node)

        for t_id in adj:
            if t_id not in visited:
                dfs(t_id, [])

        for cycle in cycles_found:
            cycle_titles = [str(get_val(task_by_id[nid], "title", nid)) for nid in cycle if nid in task_by_id]
            risks.append(
                RiskItem(
                    title="Circular Task Dependency Detected",
                    description=f"Circular dependency cycle detected involving task(s): {', '.join(cycle_titles)}. Tasks cannot be scheduled until cycle is resolved.",
                    severity="critical",
                    category="dependency",
                    affected_tasks=cycle_titles,
                    recommendation="Remove or decouple prerequisite dependencies in the task chain to break the circular deadlock.",
                    confidence=0.95,
                )
            )

        return risks

    def _detect_bottlenecks(self, tasks, task_by_id, get_val) -> List[RiskItem]:
        risks = []
        dependents_count: Dict[str, List[str]] = {}

        for t in tasks:
            t_id = str(get_val(t, "id", ""))
            t_title = str(get_val(t, "title", t_id))
            deps = get_val(t, "depends_on", []) or []

            for dep_id in deps:
                dep_str = str(dep_id)
                if dep_str not in dependents_count:
                    dependents_count[dep_str] = []
                dependents_count[dep_str].append(t_title)

        for dep_id, downstream_titles in dependents_count.items():
            if len(downstream_titles) >= 3 and dep_id in task_by_id:
                bottleneck_title = str(get_val(task_by_id[dep_id], "title", dep_id))
                severity = "high" if len(downstream_titles) >= 5 else "medium"
                risks.append(
                    RiskItem(
                        title=f"Dependency Bottleneck: '{bottleneck_title}'",
                        description=f"Task '{bottleneck_title}' is a critical bottleneck blocking {len(downstream_titles)} downstream tasks. Any delay will cascade across dependent features.",
                        severity=severity,
                        category="dependency",
                        affected_tasks=[bottleneck_title] + downstream_titles[:4],
                        recommendation="Prioritize task completion early or split into parallel independent sub-tasks to unblock downstream work.",
                        confidence=0.90,
                    )
                )

        return risks

    def _detect_blocked_tasks(self, tasks, task_by_id, sprint_number_map, get_val) -> List[RiskItem]:
        risks = []

        for t in tasks:
            t_id = str(get_val(t, "id", ""))
            t_title = str(get_val(t, "title", t_id))
            t_sprint_id = str(get_val(t, "sprint_id", ""))
            t_sprint_num = sprint_number_map.get(t_sprint_id)
            deps = get_val(t, "depends_on", []) or []

            for dep_id in deps:
                dep_str = str(dep_id)
                if dep_str in task_by_id:
                    dep_task = task_by_id[dep_str]
                    dep_title = str(get_val(dep_task, "title", dep_str))
                    dep_sprint_id = str(get_val(dep_task, "sprint_id", ""))
                    dep_sprint_num = sprint_number_map.get(dep_sprint_id)

                    # Check if prerequisite is in a later sprint than dependent task
                    if t_sprint_num and dep_sprint_num and dep_sprint_num > t_sprint_num:
                        risks.append(
                            RiskItem(
                                title=f"Task Scheduled Out of Order: '{t_title}'",
                                description=f"Task '{t_title}' is scheduled in Sprint {t_sprint_num} but depends on prerequisite '{dep_title}' scheduled in Sprint {dep_sprint_num}.",
                                severity="high",
                                category="dependency",
                                affected_sprint=t_sprint_num,
                                affected_tasks=[t_title, dep_title],
                                recommendation=f"Re-order sprint schedule so prerequisite '{dep_title}' completes in or before Sprint {t_sprint_num}.",
                                confidence=0.92,
                            )
                        )

        return risks

    def _detect_dependency_chains(self, tasks, task_by_id, get_val) -> List[RiskItem]:
        risks = []
        adj = {}
        for t in tasks:
            t_id = str(get_val(t, "id", ""))
            deps = get_val(t, "depends_on", []) or []
            adj[t_id] = [str(d) for d in deps if str(d) in task_by_id]

        memo = {}

        def get_chain_depth(node, path_set=None):
            if path_set is None:
                path_set = set()
            if node in path_set:
                return (0, [])
            if node in memo:
                return memo[node]
            if not adj.get(node):
                memo[node] = (1, [node])
                return memo[node]

            path_set.add(node)
            max_depth = 0
            max_chain = []
            for child in adj[node]:
                c_depth, c_chain = get_chain_depth(child, path_set.copy())
                if c_depth > max_depth:
                    max_depth = c_depth
                    max_chain = c_chain

            memo[node] = (max_depth + 1, [node] + max_chain)
            return memo[node]

        longest_depth = 0
        longest_chain_nodes = []

        for t_id in adj:
            depth, chain = get_chain_depth(t_id)
            if depth > longest_depth:
                longest_depth = depth
                longest_chain_nodes = chain

        if longest_depth >= 4:
            chain_titles = [str(get_val(task_by_id[nid], "title", nid)) for nid in longest_chain_nodes if nid in task_by_id]
            severity = "high" if longest_depth >= 6 else "medium"
            risks.append(
                RiskItem(
                    title=f"Long Dependency Chain ({longest_depth} Sequential Tasks)",
                    description=f"A long dependency chain of {longest_depth} sequential tasks was identified. Serial execution increases cumulative delivery risk.",
                    severity=severity,
                    category="dependency",
                    affected_tasks=chain_titles[:5],
                    recommendation="Refactor dependency requirements and decouple features to enable concurrent development.",
                    confidence=0.88,
                )
            )

        return risks


dependency_risk_engine = DependencyRiskEngine()
