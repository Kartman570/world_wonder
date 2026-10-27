from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('smith',dict(cloth=(.07,.075,.07),shirt=(.21,.19,.15),apron=(.09,.06,.035),hair_style='bald',beard='trimmed',hair=(.10,.08,.05),width=1.10,height=1.03,face_width=1.09,rolled_sleeves=True,short_tunic=True,mallet=True,smithing=True,clip_frames={'work':10}))
