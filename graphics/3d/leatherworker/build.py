from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('leatherworker',dict(cloth=(.14,.055,.045),shirt=(.20,.18,.14),apron=(.105,.065,.035),hair_style='bald',beard='trimmed',width=1.01,hair=(.11,.095,.075),tool_belt=True,knife=True,leatherwork=True))
