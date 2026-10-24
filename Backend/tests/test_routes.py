#!/usr/bin/env python
"""Test if routes are registered"""
import sys
sys.path.insert(0, '.')

from main import app

print("=" * 60)
print("Registered Routes:")
print("=" * 60)

for rule in app.url_map.iter_rules():
    methods = ','.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
    print(f"{rule.endpoint:30s} {methods:20s} {rule.rule}")

print("\n" + "=" * 60)
print("Looking for auth routes:")
print("=" * 60)

auth_routes = [rule for rule in app.url_map.iter_rules() if 'auth' in rule.rule]
if auth_routes:
    for route in auth_routes:
        methods = ','.join(sorted(route.methods))
        print(f"✓ {route.rule} [{methods}]")
else:
    print("✗ No auth routes found!")
