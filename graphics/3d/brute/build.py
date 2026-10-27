from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('brute',dict(cloth=(.09,.085,.075),shirt=(.14,.12,.09),leather=(.105,.065,.035),armor='jack',rolled_sleeves=True,hair_style='bald',beard='trimmed',hair=(.045,.03,.02),width=1.18,height=1.07,face_width=1.12,maul=True,clip_frames={'attack':10}))
