"""Narrow torch flame overlay, without a baked hand or fixed wall bracket."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from flame_effect import build
build('torch_flame',height=.35,width=.11,tongues=3,coals=False,sparks=1,optical_gain=4.7)
