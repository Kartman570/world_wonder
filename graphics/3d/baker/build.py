from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('baker',dict(cloth=(.18,.075,.045),shirt=(.26,.16,.10),leather=(.13,.075,.035),hat='headwrap',hair=(.055,.035,.02),moustache=True,width=1.10,height=.96,belly=.025,belt=False,short_tunic=True,rolled_sleeves=True,apron=(.35,.29,.20),baking=True,head_work_pitch=.18,clip_frames={'work':32},clip_fps={'work':12}))
