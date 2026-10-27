from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('bandit',dict(cloth=(.09,.065,.045),shirt=(.13,.12,.10),hat='hood',face_wrap=True,ragged=True,hair=(.035,.025,.02),width=.95,height=.99,face_width=.97,sword=True,stoop=.06))
