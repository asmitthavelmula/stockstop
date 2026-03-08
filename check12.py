import requests, json
r = requests.get('http://localhost:8000/api/stocks/12/latest_analysis/')
print('status', r.status_code)
print(json.dumps(r.json(), indent=2)[:1000])
