from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from equine import build
model=build('unicorn',unicorn=True,tack=True)
