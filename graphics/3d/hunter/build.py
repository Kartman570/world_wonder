from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('hunter',dict(cloth=(.075,.10,.055),shirt=(.18,.19,.14),leather=(.10,.075,.04),armor='jack',hat='hood',beard='trimmed',hair=(.06,.04,.025),width=1.0,face_width=1.04,cape=(.075,.10,.06),fur_collar=(.16,.13,.085),bow=True,bow_length=1.55,quiver=True,knife=True,butchering=True))
