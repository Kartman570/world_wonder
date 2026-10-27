from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('fairy',dict(cloth=(.14,.115,.065),shirt=(.23,.22,.16),leather=(.12,.085,.045),skin=(.54,.51,.45),hair=(.12,.10,.07),hair_style='bald',width=.66,height=.72,face_width=.95,short_tunic=True,rolled_sleeves=True,emralaani=True,flying=True,leg_scale=.50,head_control=True,clip_frames={'idle':8,'walk':8,'run':12,'attack':8,'death':12,'work':16},clip_fps={'idle':12,'walk':12,'run':16,'work':12}))
