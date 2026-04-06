"""
LangGraph StateGraph pipeline — orchestrates all 4 agents.
"""

from langgraph.graph import StateGraph, START, END

from models.schemas import AgentState
from agents.skill_analyser import skill_analyser_node
from agents.issue_finder import issue_finder_node
from agents.codebase_reader import codebase_reader_node
from agents.intro_drafter import intro_drafter_node


def _should_retry_or_continue(state: AgentState) -> str:
    matched = state.get("matched_issues", [])
    retry_count = state.get("retry_count", 0)

    if len(matched) > 0:
        return "codebase_reader"
    elif retry_count < 2:
        return "issue_finder"
    else:
        return END


def build_pipeline() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("skill_analyser", skill_analyser_node)
    graph.add_node("issue_finder", issue_finder_node)
    graph.add_node("codebase_reader", codebase_reader_node)
    graph.add_node("intro_drafter", intro_drafter_node)

    graph.add_edge(START, "skill_analyser")
    graph.add_edge("skill_analyser", "issue_finder")

    graph.add_conditional_edges(
        "issue_finder",
        _should_retry_or_continue,
        {
            "codebase_reader": "codebase_reader",
            "issue_finder": "issue_finder",
            END: END,
        },
    )

    graph.add_edge("codebase_reader", "intro_drafter")
    graph.add_edge("intro_drafter", END)

    return graph.compile()


# Singleton compiled pipeline
_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = build_pipeline()
    return _pipeline
