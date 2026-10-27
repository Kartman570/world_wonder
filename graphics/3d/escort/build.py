from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('escort',dict(cloth=(.09,.12,.14),shirt=(.16,.18,.18),leather=(.11,.07,.04),armor='jack',hat='nasal',hair=(.055,.04,.025),beard='trimmed',width=1.04,face_width=1.04,cape=(.08,.10,.12),sword=True,shield=True))
