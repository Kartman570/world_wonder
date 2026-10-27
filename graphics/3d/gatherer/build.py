from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('gatherer',dict(cloth=(.13,.17,.065),shirt=(.24,.20,.12),leather=(.15,.09,.035),hat='headwrap',hair=(.12,.07,.025),hair_style='long',width=.93,height=.96,face_width=.94,short_tunic=True,herb_pouches=True,gathering=True,head_work_pitch=.18,clip_frames={'work':16}))
