from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('escort_archer',dict(cloth=(.10,.13,.10),shirt=(.18,.19,.17),leather=(.15,.095,.045),armor='jack',hat='hood',hair=(.12,.065,.025),width=.97,face_width=.96,cape=(.12,.115,.09),bow=True,quiver=True))
