from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('forester',dict(cloth=(.11,.10,.055),shirt=(.19,.17,.12),hat='cap',cap_color=(.13,.11,.07),hair_style='long',beard='long',hair=(.09,.045,.02),width=1.06,height=1.02,face_width=1.05,rolled_sleeves=True,short_tunic=True,axe=True,woodcutting=True,clip_frames={'attack':8,'work':10}))
