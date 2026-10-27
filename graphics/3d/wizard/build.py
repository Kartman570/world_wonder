from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('wizard',dict(cloth=(.045,.07,.13),shirt=(.07,.10,.16),robe=True,hat='scholar',hair_style='long',beard='long',hair=(.32,.30,.25),width=.95,height=1.02,face_width=.98,seize=True,stoop=.035))
