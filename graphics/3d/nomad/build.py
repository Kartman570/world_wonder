from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('nomad',dict(cloth=(.17,.045,.035),shirt=(.13,.10,.07),leather=(.085,.055,.035),skin=(.53,.48,.40),hair=(.045,.035,.025),hair_style='long',armor='plain',width=.80,height=1.13,face_width=.88,short_tunic=True,sword=True,emralaani=True,mounted=True,head_control=True,clip_frames={'walk':8,'run':12,'attack':8,'death':12,'work':16}))
