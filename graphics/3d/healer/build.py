from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('healer',dict(cloth=(.075,.15,.14),shirt=(.22,.25,.23),leather=(.12,.075,.040),hat='cap',cap_color=(.065,.095,.09),hair=(.25,.24,.21),beard='trimmed',width=.94,height=1.02,face_width=.96,robe=True,buttons=True,collar=True,satchel=True,healing=True,head_work_pitch=.23,clip_frames={'work':16},clip_fps={'work':10}))
