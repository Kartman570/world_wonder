from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('arct_miner',dict(cloth=(.095,.10,.07),shirt=(.16,.18,.10),leather=(.075,.065,.04),skin=(.19,.145,.23),hair=(.08,.09,.045),width=1.48,height=1.30,face_width=1.0,short_tunic=True,arctarian=True,arct_probe=True,head_control=True,output_size=192,camera_target=1.45,clip_frames={'attack':8,'death':10,'work':12},clip_fps={'walk':8,'run':10}))
