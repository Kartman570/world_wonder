from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('herbalist',dict(cloth=(.12,.135,.09),shirt=(.24,.20,.14),female=True,hair_style='bun',hair=(.12,.075,.04),height=.94,width=.90,face_width=.94,cape=(.14,.09,.055),herb_pouches=True,herbalism=True,head_work_pitch=.30))
