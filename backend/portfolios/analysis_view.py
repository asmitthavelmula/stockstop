from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services.pipeline import run_portfolio_analysis


@api_view(['GET'])
def portfolio_analysis(request, id):
    """Return full portfolio analysis including clustering, regression, logistic, correlation."""
    try:
        data = run_portfolio_analysis(id)
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
