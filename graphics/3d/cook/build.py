from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('cook',dict(cloth=(.16,.06,.035),shirt=(.25,.22,.16),apron=(.34,.30,.23),apron_stains=True,hat='cap',cap_color=(.29,.26,.20),moustache=True,hair=(.07,.045,.025),belly=.06,width=1.06,height=.99,face_width=1.10,rolled_sleeves=True,short_tunic=True,stirring=True))
