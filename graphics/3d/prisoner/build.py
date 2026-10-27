from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('prisoner',dict(cloth=(.16,.13,.09),shirt=(.27,.245,.19),width=.88,stoop=.14,ragged=True,belt=False,irons=True,hair_style='bald',hair=(.035,.028,.022)))
