from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('nomad_archer',dict(cloth=(.055,.095,.13),shirt=(.14,.13,.09),leather=(.095,.065,.04),skin=(.51,.47,.41),hair=(.075,.055,.035),hair_style='bald',armor='plain',width=.78,height=1.13,face_width=.86,short_tunic=True,bow=True,bow_length=1.10,quiver=True,emralaani=True,mounted=True,head_control=True,clip_frames={'walk':8,'run':12,'attack':8,'death':12,'work':16}))
