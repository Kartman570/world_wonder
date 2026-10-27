from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('farmer_trader',dict(cloth=(.075,.12,.055),shirt=(.26,.235,.17),apron=(.30,.25,.16),hat='straw',basket=True,sack=True,width=.96,hair=(.07,.035,.018)))
