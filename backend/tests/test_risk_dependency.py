import pytest
from app.risks.dependency import DependencyRiskEngine


def test_dependency_circular_detection():
    engine = DependencyRiskEngine()
    tasks = [
        {"id": "t1", "title": "Task 1", "depends_on": ["t2"]},
        {"id": "t2", "title": "Task 2", "depends_on": ["t1"]},
    ]

    risks = engine.analyze(tasks)
    critical_risks = [r for r in risks if r.severity == "critical"]
    assert len(critical_risks) == 1
    assert "Circular Task Dependency Detected" in critical_risks[0].title
    assert "Task 1" in critical_risks[0].description or "Task 2" in critical_risks[0].description


def test_dependency_bottleneck_detection():
    engine = DependencyRiskEngine()
    tasks = [
        {"id": "t-root", "title": "Root Setup Task", "depends_on": []},
        {"id": "t-1", "title": "Feature 1", "depends_on": ["t-root"]},
        {"id": "t-2", "title": "Feature 2", "depends_on": ["t-root"]},
        {"id": "t-3", "title": "Feature 3", "depends_on": ["t-root"]},
    ]

    risks = engine.analyze(tasks)
    bottleneck_risks = [r for r in risks if "Bottleneck" in r.title]
    assert len(bottleneck_risks) == 1
    assert "Root Setup Task" in bottleneck_risks[0].title
    assert len(bottleneck_risks[0].affected_tasks) >= 3


def test_dependency_blocked_out_of_order_detection():
    engine = DependencyRiskEngine()
    sprints = [
        {"id": "s1", "sprint_number": 1},
        {"id": "s2", "sprint_number": 2},
    ]
    tasks = [
        {"id": "t-prereq", "title": "Database Schema", "sprint_id": "s2", "depends_on": []},
        {"id": "t-dependent", "title": "API Endpoint", "sprint_id": "s1", "depends_on": ["t-prereq"]},
    ]

    risks = engine.analyze(tasks, sprints)
    blocked_risks = [r for r in risks if "Out of Order" in r.title]
    assert len(blocked_risks) == 1
    assert blocked_risks[0].severity == "high"
    assert "Database Schema" in blocked_risks[0].description


def test_dependency_long_chain_detection():
    engine = DependencyRiskEngine()
    tasks = [
        {"id": "t1", "title": "Step 1", "depends_on": []},
        {"id": "t2", "title": "Step 2", "depends_on": ["t1"]},
        {"id": "t3", "title": "Step 3", "depends_on": ["t2"]},
        {"id": "t4", "title": "Step 4", "depends_on": ["t3"]},
    ]

    risks = engine.analyze(tasks)
    chain_risks = [r for r in risks if "Long Dependency Chain" in r.title]
    assert len(chain_risks) == 1
    assert "Step 1" in chain_risks[0].affected_tasks
