from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('groom',dict(cloth=(.09,.12,.15),shirt=(.28,.24,.17),leather=(.12,.07,.035),hat='cap',cap_color=(.18,.13,.07),hair=(.10,.055,.03),beard='trimmed',width=1.02,height=1.01,short_tunic=True,rolled_sleeves=True,grooming=True,head_work_pitch=.22,clip_frames={'work':12},clip_fps={'work':10}))
