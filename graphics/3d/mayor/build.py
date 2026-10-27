from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('mayor',dict(cloth=(.055,.065,.10),shirt=(.22,.19,.16),robe=True,hat='livery',cap_color=(.16,.045,.035),fur_collar=(.22,.19,.15),civic_chain=True,moustache=True,hair=(.18,.15,.11),belly=.02,width=1.04,height=1.01,face_width=1.10,ledger=True,head_work_pitch=.45,head_work_curve=[(0,.45),(.50,.45),(.65,0),(.85,0),(1,.45)],head_work_yaw=[(0,0),(.55,0),(.70,.12),(.85,.12),(1,0)],clip_frames={'work':12}))
