from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('beekeeper',dict(cloth=(.29,.27,.20),shirt=(.31,.29,.22),leather=(.16,.12,.065),hat='hood',face_wrap=True,gloves=True,hair=(.07,.05,.03),hair_style='bald',width=.98,height=1.01,short_tunic=True,beekeeping=True,head_work_pitch=.15,head_work_curve=[(0,.30),(.40,.08),(.70,.08),(1,.30)],clip_frames={'work':24},clip_fps={'work':10}))
