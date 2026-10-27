from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('bowyer',dict(cloth=(.085,.12,.11),shirt=(.23,.21,.16),apron=(.22,.13,.065),hair_style='long',width=.94,hair=(.085,.040,.017),bow=True,knife=True,staves=True))
