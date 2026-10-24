#!/usr/bin/env python3
"""
Script to clean up old Backend folder after verifying new structure works.
RUN THIS ONLY AFTER TESTING THE NEW STRUCTURE!
"""

import os
import shutil

def cleanup():
    print("=" * 60)
    print("BoxGuard - Cleanup Old Structure")
    print("=" * 60)
    print()
    print("WARNING: This will DELETE the old Backend/ folder!")
    print("Make sure the new backend/ structure works before proceeding.")
    print()
    response = input("Type 'YES' to confirm deletion: ")
    
    if response.strip() != "YES":
        print("Cleanup cancelled.")
        return
    
    files_to_remove = [
        'Backend/main.py',
        'Backend/main_minimal.py',
        'Backend/database.py',
        'Backend/detection.py',
        'Backend/tracker.py',
        'Backend/auth.py',
        'Backend/video_recorder.py',
        'Backend/pdf_generator.py',
        'Backend/start_server.py',
        'Backend/check_sessions.py',
        'Backend/debug_batch.py',
        'Backend/test_confidence.py',
        'Backend/test_imports.py',
        'Backend/test_routes.py',
        'Backend/test_server.html',
        'Backend/restructure.py',
        'Backend/install_auth.bat',
        'Backend/restart_server.bat',
    ]
    
    print("\nRemoving individual files...")
    for file in files_to_remove:
        if os.path.exists(file):
            try:
                os.remove(file)
                print(f"  ✓ Removed {file}")
            except Exception as e:
                print(f"  ✗ Failed to remove {file}: {e}")
    
    # Remove __pycache__
    pycache_dir = 'Backend/__pycache__'
    if os.path.exists(pycache_dir):
        try:
            shutil.rmtree(pycache_dir)
            print(f"  ✓ Removed {pycache_dir}")
        except Exception as e:
            print(f"  ✗ Failed to remove {pycache_dir}: {e}")
    
    # Remove venv if exists
    venv_dir = 'Backend/venv'
    if os.path.exists(venv_dir):
        print(f"\n  Note: {venv_dir} detected - you may want to remove it manually")
    
    print("\n" + "=" * 60)
    print("Cleanup Complete!")
    print("=" * 60)
    print("\nKeeping:")
    print("  - Backend/.env (moved to backend/.env)")
    print("  - Backend/requirements.txt (moved to backend/requirements.txt)")
    print("  - Backend/models/ (moved to backend/models/)")
    print("\nYou can now delete the empty Backend/ folder manually.")

if __name__ == "__main__":
    cleanup()
