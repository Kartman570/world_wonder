from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('brewer',dict(cloth=(.105,.13,.09),shirt=(.19,.22,.22),leather=(.13,.085,.035),hair=(.14,.065,.027),hair_style='bald',beard='long',width=1.12,height=1.02,belly=.035,belt=False,short_tunic=True,rolled_sleeves=True,apron=(.20,.125,.055),brewing=True,head_work_pitch=.13,clip_frames={'work':16},clip_fps={'work':10}))
