from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('quartermaster',dict(cloth=(.10,.12,.11),shirt=(.18,.18,.16),leather=(.12,.08,.045),hat='livery',cap_color=(.10,.12,.11),beard='trimmed',hair=(.12,.10,.075),width=1.0,height=1.0,face_width=1.02,short_tunic=True,satchel=True,ledger=True,warehouse=True,head_work_pitch=.22,head_work_curve=[(0,.22),(.30,.22),(.43,.45),(.60,.45),(.70,0),(.82,0),(1,.22)],head_work_yaw=[(0,0),(.60,0),(.72,.35),(.80,.35),(1,0)],clip_frames={'work':24}))
