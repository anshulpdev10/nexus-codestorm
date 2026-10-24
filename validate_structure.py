#!/usr/bin/env python3
"""
Validate that the new backend structure is correctly set up.
Run this before starting the server with the new structure.
"""

import os
import sys

def check_file(path, description):
    """Check if a file exists"""
    if os.path.exists(path):
        print(f"  ✓ {description}")
        return True
    else:
        print(f"  ✗ {description} - MISSING")
        return False

def check_dir(path, description):
    """Check if a directory exists"""
    if os.path.isdir(path):
        print(f"  ✓ {description}")
        return True
    else:
        print(f"  ✗ {description} - MISSING")
        return False

def validate():
    print("=" * 60)
    print("BoxGuard - Structure Validation")
    print("=" * 60)
    print()
    
    all_ok = True
    
    # Check backend structure
    print("[1] Backend Core Structure")
    all_ok &= check_dir("backend", "backend/ folder")
    all_ok &= check_dir("backend/core", "backend/core/ folder")
    all_ok &= check_file("backend/core/__init__.py", "backend/core/__init__.py")
    all_ok &= check_file("backend/core/app.py", "backend/core/app.py (main application)")
    all_ok &= check_file("backend/core/database.py", "backend/core/database.py")
    all_ok &= check_file("backend/core/detection.py", "backend/core/detection.py")
    all_ok &= check_file("backend/core/tracker.py", "backend/core/tracker.py")
    print()
    
    # Check backend services
    print("[2] Backend Services")
    all_ok &= check_dir("backend/services", "backend/services/ folder")
    all_ok &= check_file("backend/services/__init__.py", "backend/services/__init__.py")
    all_ok &= check_file("backend/services/video_recorder.py", "backend/services/video_recorder.py")
    all_ok &= check_file("backend/services/pdf_generator.py", "backend/services/pdf_generator.py")
    print()
    
    # Check backend auth
    print("[3] Backend Authentication")
    all_ok &= check_dir("backend/auth", "backend/auth/ folder")
    all_ok &= check_file("backend/auth/__init__.py", "backend/auth/__init__.py")
    all_ok &= check_file("backend/auth/auth.py", "backend/auth/auth.py")
    print()
    
    # Check backend tests
    print("[4] Backend Tests")
    all_ok &= check_dir("backend/tests", "backend/tests/ folder")
    all_ok &= check_file("backend/tests/__init__.py", "backend/tests/__init__.py")
    print()
    
    # Check backend config
    print("[5] Backend Configuration")
    all_ok &= check_file("backend/.env", "backend/.env")
    all_ok &= check_file("backend/requirements.txt", "backend/requirements.txt")
    all_ok &= check_file("backend/README.md", "backend/README.md")
    print()
    
    # Check backend models
    print("[6] Backend Models")
    all_ok &= check_dir("backend/models", "backend/models/ folder")
    if os.path.exists("backend/models/best.pt"):
        print("  ✓ backend/models/best.pt (custom model)")
    else:
        print("  ⚠ backend/models/best.pt - NOT FOUND (will use fallback)")
    all_ok &= check_file("backend/models/yolov8n.pt", "backend/models/yolov8n.pt (fallback)")
    print()
    
    # Check data directories
    print("[7] Data Directories")
    all_ok &= check_dir("data", "data/ folder")
    all_ok &= check_dir("data/recordings", "data/recordings/ folder")
    all_ok &= check_dir("data/uploads", "data/uploads/ folder")
    all_ok &= check_dir("data/challans", "data/challans/ folder")
    print()
    
    # Check archive
    print("[8] Archive")
    all_ok &= check_dir("archive", "archive/ folder")
    all_ok &= check_dir("archive/ai", "archive/ai/ folder")
    all_ok &= check_file("archive/README.md", "archive/README.md")
    print()
    
    # Check frontend (should not have changed)
    print("[9] Frontend (unchanged)")
    all_ok &= check_dir("Frontend", "Frontend/ folder")
    all_ok &= check_dir("Frontend/src", "Frontend/src/ folder")
    all_ok &= check_file("Frontend/package.json", "Frontend/package.json")
    print()
    
    # Check documentation
    print("[10] Documentation")
    all_ok &= check_file("README.md", "README.md")
    all_ok &= check_file("PROJECT_STRUCTURE.md", "PROJECT_STRUCTURE.md")
    all_ok &= check_file("RESTRUCTURE_PLAN.md", "RESTRUCTURE_PLAN.md")
    print()
    
    # Summary
    print("=" * 60)
    if all_ok:
        print("✓ ALL CHECKS PASSED - Structure is valid!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("  1. Test the backend: cd backend && python -m core.app")
        print("  2. Test the frontend: cd Frontend && npm run dev")
        print("  3. Verify all features work")
        print("  4. Run cleanup: python cleanup_old_structure.py")
        return 0
    else:
        print("✗ VALIDATION FAILED - Some files are missing")
        print("=" * 60)
        print()
        print("Please fix the missing items before proceeding.")
        return 1

if __name__ == "__main__":
    sys.exit(validate())
