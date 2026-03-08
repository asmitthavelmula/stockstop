import requests
base = 'http://127.0.0.1:8000/api'
stock_id = 17
r = requests.post(f"{base}/stocks/{stock_id}/analyze/", json={'past_days': 365})
print('status', r.status_code)
print('response', r.text)
