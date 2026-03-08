import requests
r = requests.get('http://localhost:8000/api/portfolios/')
print(r.status_code)
print(r.text[:500])
