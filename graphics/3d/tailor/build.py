from pathlib import Path
import sys,json
root=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'3d/_shared'))
from humanoid import build
# The catalog work description requires this distinct clip explicitly.
p=root/'sprites/manifest.json';m=json.loads(p.read_text());e=next(e for e in m['catalog'] if e['id']=='tailor')
if 'sewing' not in e['animations']:
    e['animations']['sewing']=dict(description='Sews at a separate table, pushing the needle through and pulling the thread.',loop=True,suggestedFrames=8,fps=8,ready=False)
    p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
build('tailor',dict(cloth=(.09,.14,.12),shirt=(.29,.26,.20),female=True,hat='coif',height=.95,width=.88,face_width=.92,hair=(.08,.045,.025),weaving=True,leatherwork=True))
