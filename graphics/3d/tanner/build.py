from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('tanner',dict(cloth=(.10,.12,.13),shirt=(.22,.20,.16),leather=(.105,.065,.030),hat='leather',hair=(.055,.045,.035),beard='trimmed',width=1.07,height=1.0,face_width=1.04,belt=False,short_tunic=True,rolled_sleeves=True,apron=(.13,.085,.040),apron_stains=True,tanning=True,head_work_pitch=.22,clip_frames={'work':16},clip_fps={'work':10}))
