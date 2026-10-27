from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'_shared'))
from humanoid import build
build('drunkard',dict(cloth=(.17,.075,.045),shirt=(.29,.25,.19),width=1.03,belly=.055,drunk=True,mug=True,beard=True,hat='cap',hair=(.12,.075,.03)))
