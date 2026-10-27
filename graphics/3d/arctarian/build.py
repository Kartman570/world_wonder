from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('arctarian',dict(cloth=(.085,.095,.075),shirt=(.15,.17,.12),leather=(.065,.07,.055),skin=(.18,.15,.22),hair=(.07,.08,.05),width=1.58,height=1.28,face_width=1.06,short_tunic=True,arctarian=True,arct_workshop=True,head_control=True,head_work_pitch=.18,output_size=192,camera_target=1.45,clip_frames={'death':10,'work':32},clip_fps={'walk':8,'run':10,'work':12}))
