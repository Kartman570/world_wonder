from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('grain_farmer',dict(cloth=(.15,.17,.07),shirt=(.26,.22,.15),leather=(.12,.075,.035),skin=(.40,.26,.16),hat='straw',hair=(.11,.075,.04),moustache=True,width=1.03,height=1.02,belt=False,short_tunic=True,rolled_sleeves=True,grain=True,head_work_pitch=.15,clip_frames={'work':16,'attack':8},clip_fps={'work':10}))
