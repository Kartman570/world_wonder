from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('king',dict(cloth=(.10,.055,.15),shirt=(.17,.10,.18),leather=(.10,.06,.035),royal=True,beard='trimmed',hair_style='long',hair=(.24,.22,.18),width=1.02,face_width=1.08))
