#!/usr/bin/env python
"""
Startup script with dependency checking
"""
import sys
import subprocess

print("=" * 60)
print("WAREgaurd Backend Server - Startup Check")
print("=" * 60)

# Check Python version
print(f"\n✓ Python version: {sys.version}")

# Check required packages
required_packages = {
    'flask': 'Flask',
    'flask_cors': 'Flask-CORS',
    'flask_sock': 'Flask-Sock',
    'pymongo': 'PyMongo',
    'cv2': 'OpenCV',
    'numpy': 'NumPy',
    'dotenv': 'python-dotenv',
}

optional_packages = {
    'bcrypt': 'bcrypt (for authentication)',
    'jwt': 'PyJWT (for authentication)',
}

print("\n" + "=" * 60)
print("Checking Required Dependencies:")
print("=" * 60)

missing_required = []
for module, name in required_packages.items():
    try:
        __import__(module)
        print(f"✓ {name}")
    except ImportError:
        print(f"✗ {name} - MISSING")
        missing_required.append(name)

print("\n" + "=" * 60)
print("Checking Optional Dependencies (Authentication):")
print("=" * 60)

missing_optional = []
for module, name in optional_packages.items():
    try:
        __import__(module)
        print(f"✓ {name}")
    except ImportError:
        print(f"⚠ {name} - MISSING (authentication will be disabled)")
        missing_optional.append(name)

if missing_required:
    print("\n" + "=" * 60)
    print("ERROR: Missing required dependencies!")
    print("=" * 60)
    print("\nPlease install missing packages:")
    print("pip install flask flask-cors flask-sock pymongo opencv-python-headless numpy python-dotenv")
    sys.exit(1)

if missing_optional:
    print("\n" + "=" * 60)
    print("WARNING: Authentication features disabled")
    print("=" * 60)
    print("\nTo enable authentication, install:")
    print("pip install bcrypt pyjwt")
    print("\nServer will start without authentication features...")
    input("\nPress Enter to continue or Ctrl+C to cancel...")

print("\n" + "=" * 60)
print("Starting Flask Server...")
print("=" * 60)
print()

# Import and run the main app
try:
    from main import app
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
except Exception as e:
    print(f"\n✗ Server failed to start: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
