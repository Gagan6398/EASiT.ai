import sys
import os
from pathlib import Path

# Add the parent directory to the path
sys.path.insert(0, str(Path(__file__).parent))

# Change imports in main.py to absolute imports
os.chdir(str(Path(__file__).parent))

from backend.main import app

if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")
