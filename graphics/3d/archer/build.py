from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('archer',dict(cloth=(.06,.09,.075),shirt=(.16,.16,.14),leather=(.12,.07,.035),armor='jack',city_badge=True,hat='iron',hair=(.05,.035,.02),width=1.0,bow=True,quiver=True))
