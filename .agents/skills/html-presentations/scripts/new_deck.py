#!/usr/bin/env python3
"""Create editable deck sources and a standalone HTML; never overwrite a directory."""
import argparse
import json
from pathlib import Path
import re
import shutil
import uuid
from build import build

cli = argparse.ArgumentParser(description=__doc__)
cli.add_argument('directory')
cli.add_argument('--title', default='A clear story')
cli.add_argument('--lang', default='en')
args = cli.parse_args()
root = Path(args.directory).resolve()
if root.exists():
    cli.error(f'Destination already exists: {root}')
root.mkdir(parents=True)
skill = Path(__file__).resolve().parent.parent
shutil.copytree(skill / 'assets' / 'starter', root / 'source')
shutil.copy2(skill / 'scripts' / 'build.py', root / 'build.py')
config_file = root / 'source' / 'deck.json'
config = json.loads(config_file.read_text())
slug = re.sub(r'[^a-z0-9]+', '-', args.title.lower()).strip('-') or 'deck'
config.update(id=slug + '-' + uuid.uuid4().hex[:8], title=args.title, lang=args.lang)
config_file.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
build(root)
