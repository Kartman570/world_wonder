from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('merchant',dict(cloth=(.18,.095,.045),shirt=(.11,.13,.14),leather=(.12,.07,.035),hat='felt',moustache=True,hair=(.095,.055,.025),width=1.08,height=1.02,face_width=1.08,belly=.035,short_tunic=True,collar=True,buttons=True,cape=(.095,.065,.04),satchel=True,cargo=True,head_work_pitch=.20,head_work_yaw=[(0,-.16),(.25,0),(.50,.16),(.75,0),(1,-.16)],clip_frames={'work':16}))
