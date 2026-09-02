#!/usr/bin/env python3
"""Regenerate the development compose file from the demonstration one.

The dev profile is a strict subset of the demo profile: one ordering node,
three organisations. Deriving it rather than maintaining it by hand is the only
way to be sure the two do not drift -- and a dev network that has silently
stopped matching the real one is worse than no dev network, because everything
appears to work right up until the demonstration.

    python network/scripts/gen-dev-compose.py
"""

import io
import os
import sys

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required: pip install pyyaml")

HERE = os.path.dirname(os.path.abspath(__file__))
COMPOSE = os.path.join(HERE, '..', 'compose')

KEEP = [
    'orderer1.idra.obhoy.local',
    'peer0.provider.obhoy.local',
    'peer0.field.obhoy.local',
    'peer0.insurera.obhoy.local',
    'cli',
]

HEADER = """# The development profile: three organisations, one ordering node, one channel.
#
# GENERATED from docker-compose.demo.yaml by network/scripts/gen-dev-compose.py.
# Edit the demo file and regenerate; do not edit this one by hand, or the two
# will drift and the dev network will stop being a faithful subset.
#
# This profile is what everyone runs day to day. It is deliberately NOT a
# smaller version of the same claim:
#
#   - With one insurer there is no cross-insurer duplicate to refuse. Scenario
#     S2, the headline, cannot be demonstrated here at all.
#   - With one ordering node there is no institutional spread and no Raft
#     cluster -- just a single process that can stop the network.
#   - The endorsement policy on obhoy-dev is weaker than the real one.
#
# Do not screenshot this profile and call it the architecture.
"""


def main():
    with io.open(os.path.join(COMPOSE, 'docker-compose.demo.yaml'), encoding='utf-8') as f:
        src = yaml.safe_load(f)

    out = {
        'name': 'obhoy-dev',
        'volumes': {k: {} for k in ['orderer1', 'peer-provider', 'peer-field', 'peer-insurera']},
        'networks': {'obhoy': {'name': 'obhoy_net'}},
        'services': {},
    }
    for key in KEEP:
        svc = dict(src['services'][key])
        svc.pop('depends_on', None)
        if key == 'cli':
            svc['depends_on'] = [k for k in KEEP if k.startswith('peer0')]
        out['services'][key] = svc

    target = os.path.join(COMPOSE, 'docker-compose.dev.yaml')
    with io.open(target, 'w', encoding='utf-8') as f:
        f.write(HEADER)
        yaml.safe_dump(out, f, sort_keys=False, default_flow_style=False, width=200)
    print('wrote', target)
    print('services:', ', '.join(out['services']))


if __name__ == '__main__':
    main()
