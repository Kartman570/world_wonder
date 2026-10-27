from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('arct_rescuer',dict(cloth=(.09,.105,.08),shirt=(.18,.21,.15),leather=(.075,.09,.07),skin=(.23,.29,.19),hair=(.08,.09,.06),width=1.40,height=1.30,face_width=.97,short_tunic=True,arctarian=True,arct_rescue=True,head_control=True,head_work_pitch=.12,output_size=192,camera_target=1.45,clip_frames={'death':10,'work':32},clip_fps={'walk':8,'run':10,'work':10}))
