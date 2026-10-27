from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('fisher',dict(cloth=(.085,.13,.17),shirt=(.28,.25,.20),hat='straw',beard='long',hair=(.24,.22,.18),width=.98,height=.98,face_width=1.03,belly=.02,rolled_sleeves=True,bait_pouch=True,fishing=True))
