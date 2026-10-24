#!/usr/bin/env python
"""Test if all required modules can be imported"""

print("Testing imports...")

try:
    import bcrypt
    print("✓ bcrypt imported successfully")
except ImportError as e:
    print(f"✗ bcrypt import failed: {e}")

try:
    import jwt
    print("✓ jwt imported successfully")
except ImportError as e:
    print(f"✗ jwt import failed: {e}")

try:
    from auth import create_user, login_user
    print("✓ auth module imported successfully")
except Exception as e:
    print(f"✗ auth module import failed: {e}")

print("\nAll tests complete!")
