from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('provisioner',dict(cloth=(.08,.14,.09),shirt=(.25,.22,.16),belly=.045,width=1.04,hat='cap',cap_color=(.12,.10,.065),hair=(.12,.09,.055),satchel=True,provisions=True))
