from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from crossings import build
if __name__ in ['__main__','environment_build']:build('footbridge')
