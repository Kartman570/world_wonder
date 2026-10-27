from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('armorer',dict(cloth=(.055,.075,.105),shirt=(.17,.18,.17),apron=(.13,.075,.037),hat='iron',beard='trimmed',width=1.08,hair=(.055,.045,.035),mallet=True,plate=True))
