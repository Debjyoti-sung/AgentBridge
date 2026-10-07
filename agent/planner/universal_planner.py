from typing import List
from shared.protocol import Task
from agent.optimizer import OptimizationEngine

class UniversalPlanner:
    @staticmethod
    def plan(goal: str, website: str = "Active Tab") -> Task:
        return OptimizationEngine.plan_universal_task(goal, website)
