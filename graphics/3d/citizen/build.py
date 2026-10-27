from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('citizen',dict(cloth=(.22,.13,.065),shirt=(.25,.235,.20),leather=(.12,.075,.035),hair_style='long',hair=(.11,.055,.025),width=.94,height=.99,face_width=.96,short_tunic=True,purse=True,head_control=True))
