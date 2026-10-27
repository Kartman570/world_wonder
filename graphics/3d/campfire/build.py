"""Broad low campfire with glowing embers and a few sparks; no tent or firepit."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from flame_effect import build
build('campfire',height=.85,width=.52,tongues=7,coals=True,sparks=4)
