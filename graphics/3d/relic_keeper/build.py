from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('relic_keeper',dict(cloth=(.105,.115,.115),shirt=(.18,.18,.16),leather=(.075,.070,.055),hair=(.23,.22,.20),hair_style='tonsure',beard='trimmed',width=.96,height=.98,face_width=.98,armor='plain',robe=True,collar=True,chapel_keeper=True,mallet=True,hammer_fight=True,head_control=True,clip_frames={'attack':8}))
