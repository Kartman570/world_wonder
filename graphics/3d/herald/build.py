from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('herald',dict(cloth=(.06,.10,.15),shirt=(.075,.11,.16),tabard=(.30,.22,.075),hat='livery',hair=(.035,.025,.018),width=.93,face_width=.94,scroll=True))
