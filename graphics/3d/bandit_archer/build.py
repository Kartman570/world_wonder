from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('bandit_archer',dict(cloth=(.055,.085,.045),shirt=(.115,.13,.095),hat='hood',face_wrap=True,ragged=True,hair=(.06,.04,.025),width=.91,height=.98,face_width=.95,bow=True,bow_length=1.45,quiver=True,stoop=.04))
