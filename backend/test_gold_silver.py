import os
import sys
import django
from django.test import RequestFactory
from django.urls import resolve

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gold_silver.views import analysis

def run_test():
    factory = RequestFactory()
    request = factory.get('/api/gold_silver/analysis/')
    response = analysis(request)
    print("Status Code:", response.status_code)
    if response.status_code == 200:
        data = response.data
        print("Gold Ticker:", data.get('gold_ticker'))
        print("Silver Ticker:", data.get('silver_ticker'))
        print("Correlation:", data.get('correlation'))
        print("Regression Slope:", data.get('regression', {}).get('slope'))
        print("Timeseries Points:", len(data.get('timeseries', [])))
        if len(data.get('timeseries', [])) > 0:
            print("First Date:", data['timeseries'][0]['date'])
            print("Last Date:", data['timeseries'][-1]['date'])
    else:
        print("Error Response:", response.data)

if __name__ == '__main__':
    run_test()
