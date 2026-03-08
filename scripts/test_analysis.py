import requests, json
base='http://localhost:8000'
pid=5
r=requests.get(f"{base}/api/portfolios/{pid}/analysis/")
print('status', r.status_code)
print('response text:', r.text)
try:
    print('json:', json.dumps(r.json(), indent=2)[:2000])
except Exception as e:
    print('json decode error', e)
