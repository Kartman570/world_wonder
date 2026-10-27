"""Read-only queue; manifest.json is the only completion checkpoint."""
import json,sys,struct,hashlib,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def tasks(kind='all'):
    return [e for e in json.loads((ROOT/'sprites/manifest.json').read_text())['catalog'] if kind=='all' or e['type']==kind]
def complete(e):
    return e.get('spriteReady',False) and all(c.get('ready',False) or c.get('optional',False) for c in e.get('animations',{}).values())
def next_task(kind='all'):return next((e for e in tasks(kind) if not complete(e)),None)
def audit(kind='all'):
    ready=[e for e in tasks(kind) if complete(e)]
    for e in ready:
        if e.get('components'):
            expected=set()
            for name,c in e['components'].items():
                assert c.get('spriteReady'),(e['id'],name,'unfinished component')
                path=ROOT/'sprites'/c['file'];data=path.read_bytes();expected.add(path.name)
                assert data[:8]==b'\x89PNG\r\n\x1a\n',(e['id'],name)
                assert struct.unpack('!II',data[16:24])==(c['frameWidth'],c['frameHeight']),(e['id'],name)
                assert c['frames']==1 and c['directions']==1 and c['anchor']==[0,0],(e['id'],name)
                assert hashlib.sha256(data).hexdigest()[:16]==c['hash'],(e['id'],name)
            assert {p.name for p in path.parent.iterdir() if not p.name.startswith('.')}==expected,e['id']
            assert (ROOT/'3d'/e['id']/(e['id']+'.blend')).is_file(),e['id']
            continue
        path=ROOT/'sprites'/e['file'];data=path.read_bytes()
        assert data[:8]==b'\x89PNG\r\n\x1a\n',e['id']
        assert struct.unpack('!II',data[16:24])==(e['frameWidth']*(8 if e['type']=='character' else 1),e['frameHeight']*e['frames']),e['id']
        assert hashlib.sha256(data).hexdigest()[:16]==e['hash'],e['id']
        assert [p.name for p in path.parent.iterdir() if not p.name.startswith('.')]==[path.name],e['id']
        row=0
        for c in sorted((c for c in e.get('animations',{}).values() if c.get('ready')),key=lambda c:c['start']):
            assert c['start']==row,(e['id'],'clip gap/overlap');row+=c['frames']
        assert (row==e['frames'] if e['type']!='static' else e['frames']==1),e['id']
        assert (ROOT/'3d'/e['id']/(e['id']+'.blend')).is_file(),e['id']
    return dict(status='passed',verified_assets=len(ready),remaining=sum(not complete(e) for e in tasks(kind)))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['next','audit','status'],nargs='?',default='status');parser.add_argument('--kind',choices=['all','character','static','dynamic'],default='all');args=parser.parse_args()
    if args.command=='next':print(json.dumps(next_task(args.kind),ensure_ascii=False,indent=2))
    elif args.command=='audit':print(json.dumps(audit(args.kind),ensure_ascii=False,indent=2))
    else:
        entries=tasks(args.kind);done=[e['id'] for e in entries if complete(e)];pending=[e['id'] for e in entries if not complete(e)]
        print(json.dumps(dict(total=len(entries),done=len(done),completed=done,next=pending[0] if pending else None,remaining=len(pending)),ensure_ascii=False,indent=2))
