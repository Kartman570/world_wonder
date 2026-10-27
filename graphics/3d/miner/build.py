from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('miner',dict(cloth=(.11,.105,.08),shirt=(.16,.15,.12),leather=(.12,.08,.04),skin=(.39,.245,.15),armor='plain',hat='leather',beard='trimmed',hair=(.04,.03,.025),width=.98,height=.97,face_width=1.06,rolled_sleeves=True,short_tunic=True,pickaxe=True,mining=True,head_work_pitch=.12,clip_frames={'attack':8,'work':12}))
