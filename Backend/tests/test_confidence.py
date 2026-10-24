#!/usr/bin/env python3
"""
Test script to verify confidence threshold endpoint is working
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_confidence_endpoint():
    """Test the /settings/confidence endpoint"""
    print("Testing confidence threshold endpoint...")
    
    # Test with different confidence values
    test_values = [0.25, 0.5, 0.75, 0.9]
    
    for value in test_values:
        print(f"\n→ Setting confidence to {value}")
        try:
            response = requests.post(
                f"{BASE_URL}/settings/confidence",
                json={"value": value},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Success! Server returned: {data}")
                if abs(data.get("confidence", 0) - value) < 0.01:
                    print(f"✓ Confidence value matches: {data.get('confidence')}")
                else:
                    print(f"✗ Confidence mismatch! Expected {value}, got {data.get('confidence')}")
            else:
                print(f"✗ Error: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Request failed: {e}")
    
    print("\n" + "="*50)
    print("Test complete!")

if __name__ == "__main__":
    test_confidence_endpoint()
