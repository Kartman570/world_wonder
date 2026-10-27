from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('miller',dict(cloth=(.25,.24,.20),shirt=(.31,.29,.24),leather=(.13,.095,.055),hat='coif',hair=(.16,.14,.11),beard='trimmed',width=1.08,height=.98,belly=.018,belt=False,short_tunic=True,rolled_sleeves=True,apron=(.36,.33,.26),milling=True,head_work_pitch=.12,clip_frames={'work':32},clip_fps={'work':12}))
