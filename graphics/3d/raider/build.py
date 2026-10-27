from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('raider',dict(cloth=(.16,.055,.035),shirt=(.20,.16,.12),leather=(.105,.06,.03),armor='jack',hat='nasal',beard='long',hair=(.10,.055,.025),width=1.08,height=1.01,face_width=1.06,fur_collar=(.13,.105,.07),axe=True,clip_frames={'attack':8}))
