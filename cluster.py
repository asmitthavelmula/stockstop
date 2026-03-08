import argparse
import os
import sys
import numpy as np
import django
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from portfolios.models import Portfolio, Stock, StockAnalysis

def get_stocks(portfolio_id):
    return list(Stock.objects.filter(portfolio_id=portfolio_id).select_related("company"))

def get_latest_analysis(stock):
    return stock.analyses.first()

def build_dataset(portfolio_id):
    stocks = get_stocks(portfolio_id)
    rows = []
    for s in stocks:
        la = get_latest_analysis(s)
        if not la:
            continue
        pe = float(la.pe_ratio_current or 0)
        discount = float(la.discount_percentage or 0)
        opportunity = float(la.opportunity_score or 0)
        rows.append({
            "id": s.id,
            "symbol": s.company.symbol,
            "features": np.array([pe, discount, opportunity], dtype=np.float64),
            "metrics": {"pe": pe, "discount": discount, "opportunity": opportunity}
        })
    return rows

def kmeans(X, k, max_iters=50, seed=42):
    rng = np.random.default_rng(seed)
    n = X.shape[0]
    idx = rng.choice(n, size=k, replace=False)
    centroids = X[idx]
    labels = np.zeros(n, dtype=np.int32)
    for _ in range(max_iters):
        dists = np.linalg.norm(X[:, None, :] - centroids[None, :, :], axis=2)
        new_labels = np.argmin(dists, axis=1)
        if np.array_equal(labels, new_labels):
            break
        labels = new_labels
        for i in range(k):
            pts = X[labels == i]
            if len(pts) == 0:
                centroids[i] = X[rng.integers(0, n)]
            else:
                centroids[i] = pts.mean(axis=0)
    return labels, centroids

def summarize(rows, labels, centroids):
    k = centroids.shape[0]
    clusters = []
    for i in range(k):
        members = [r for r, lab in zip(rows, labels) if lab == i]
        top_opportunity = None
        top_discount = None
        top_pe = None
        if members:
            top_opportunity = max(members, key=lambda r: r["metrics"]["opportunity"])
            top_discount = max(members, key=lambda r: r["metrics"]["discount"])
            top_pe = max(members, key=lambda r: r["metrics"]["pe"])
        clusters.append({
            "index": i,
            "size": len(members),
            "centroid": centroids[i].tolist(),
            "top": {
                "opportunity": top_opportunity["symbol"] if top_opportunity else None,
                "discount": top_discount["symbol"] if top_discount else None,
                "pe": top_pe["symbol"] if top_pe else None,
            },
            "members": [{"symbol": m["symbol"], **m["metrics"]} for m in members]
        })
    return {"clusters": clusters}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--portfolio", type=int)
    parser.add_argument("--k", type=int, default=3)
    args = parser.parse_args()
    portfolio_id = args.portfolio or int(input("Enter portfolio id: ").strip())
    rows = build_dataset(portfolio_id)
    if not rows:
        print("No analyzed stocks available")
        return
    X = np.stack([r["features"] for r in rows], axis=0)
    k = min(args.k, len(rows)) if len(rows) > 0 else args.k
    labels, centroids = kmeans(X, k)
    summary = summarize(rows, labels, centroids)
    for c in summary["clusters"]:
        print(f"Cluster {c['index']} size={c['size']} centroid={c['centroid']}")
        print(f"  Top PE: {c['top']['pe']}")
        print(f"  Top Discount: {c['top']['discount']}")
        print(f"  Top Opportunity: {c['top']['opportunity']}")
        for m in c["members"]:
            print(f"    {m['symbol']} pe={m['pe']:.2f} discount={m['discount']:.2f} opp={m['opportunity']:.2f}")

if __name__ == "__main__":
    main()
