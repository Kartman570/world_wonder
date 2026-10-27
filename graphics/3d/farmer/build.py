from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('farmer',dict(cloth=(.22,.16,.07),shirt=(.32,.29,.21),width=.96,hat='headwrap',beard='trimmed',hair=(.10,.065,.035),rolled_sleeves=True,flax=True))
