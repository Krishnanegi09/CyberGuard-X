#!/usr/bin/env python3
"""
CYBERGUARD-X — Python Unified Development Launcher
Executes scripts/start.sh to start Database, Backend, and Frontend.
"""
import os
import sys
import subprocess

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    start_sh = os.path.join(root, "scripts", "start.sh")
    
    if not os.path.exists(start_sh):
        print(f"[Error] Could not find {start_sh}")
        sys.exit(1)
        
    try:
        args = [start_sh] + sys.argv[1:]
        subprocess.run(args, check=True)
    except KeyboardInterrupt:
        print("\n[CYBERGUARD-X] Launcher exited cleanly.")
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

if __name__ == "__main__":
    main()
