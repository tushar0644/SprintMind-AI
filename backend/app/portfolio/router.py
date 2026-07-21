from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from app.services.auth import get_current_user
from app.portfolio.schemas import PortfolioDashboardResponse
from app.portfolio.aggregator import PortfolioAggregator, portfolio_aggregator

router = APIRouter(prefix="/portfolio", tags=["AI Portfolio Dashboard"])


def get_portfolio_aggregator() -> PortfolioAggregator:
    return portfolio_aggregator


@router.get("/dashboard", response_model=PortfolioDashboardResponse)
async def get_portfolio_dashboard(
    current_user = Depends(get_current_user),
    aggregator: PortfolioAggregator = Depends(get_portfolio_aggregator),
):
    """
    Returns AI Portfolio Dashboard aggregating health scores, risk counts, sprint progress,
    velocities, milestone timelines, health distribution, and projects requiring attention
    across all workspace projects.
    """
    user_id = getattr(current_user, "id", None) or current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return aggregator.generate_portfolio_dashboard(owner_id=UUID(str(user_id)))
