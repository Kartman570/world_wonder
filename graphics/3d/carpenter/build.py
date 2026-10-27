from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('carpenter',dict(cloth=(.13,.095,.060),shirt=(.26,.20,.12),leather=(.10,.060,.025),hat='cap',cap_color=(.20,.065,.030),hair=(.09,.045,.020),beard='trimmed',width=1.04,height=1.02,short_tunic=True,rolled_sleeves=True,tool_belt=True,carpentry=True,head_work_pitch=.18,clip_frames={'work':40},clip_fps={'work':12}))
