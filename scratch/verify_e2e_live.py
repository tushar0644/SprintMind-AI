import requests

def main():
    base_url = "http://localhost:8000"
    print("Connecting to local backend at:", base_url)
    
    # 1. Check health
    try:
        res = requests.get(f"{base_url}/health")
        print(f"GET /health: {res.status_code}")
    except Exception as e:
        print(f"Error checking /health: {e}")
        return

    # 2. Check detailed monitoring health
    try:
        res = requests.get(f"{base_url}/api/monitoring/health")
        print(f"GET /api/monitoring/health: {res.status_code}")
        print(res.json())
    except Exception as e:
        print(f"Error checking /api/monitoring/health: {e}")

    # 3. Check versioning preparation aliases (expect 401 Unauthorized for both)
    try:
        res_legacy = requests.post(f"{base_url}/api/ai/sprint-plan", json={})
        print(f"POST /api/ai/sprint-plan (legacy): {res_legacy.status_code}")
        
        res_v1 = requests.post(f"{base_url}/api/v1/ai/sprint-plan", json={})
        print(f"POST /api/v1/ai/sprint-plan (v1): {res_v1.status_code}")
    except Exception as e:
        print(f"Error checking versioning: {e}")

if __name__ == "__main__":
    main()
