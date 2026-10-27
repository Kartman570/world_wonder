from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('captive',dict(cloth=(.16,.14,.105),shirt=(.21,.19,.15),leather=(.09,.065,.035),skin=(.38,.27,.19),hair=(.075,.045,.025),hair_style='bald',width=.86,height=.98,face_width=.94,belt=False,ragged=True,stoop=.10,exhausted=True,head_control=True,head_idle_pitch=.20))
