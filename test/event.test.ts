import { AudioGraph } from '../src/graph';
import { EventManager } from '../src/event';
import { EventDefSet } from '../src/json';

const playedSfx: string[] = [];

const graphMock = ({
  playsfx: jest.fn(async (id: string) => {
    playedSfx.push(id);
  }),
} as unknown) as AudioGraph;

let nextRandom = 0;
function random() {
  return nextRandom;
}

// Clear playedSfx list each time
function clearSFX() {
  playedSfx.splice(0, playedSfx.length);
}
beforeEach(clearSFX);

describe('A simple SFX event', () => {
  const defs: EventDefSet = {
    SimpleEvent: 'SimpleSFX',
  };
  const events = new EventManager(defs, graphMock);

  test('Event plays SFX', () => {
    events.execute('SimpleEvent');
    expect(playedSfx).toEqual(['SimpleSFX']);
  });

  test('Unknown event plays itself', () => {
    events.execute('MissingEvent');
    expect(playedSfx).toEqual(['MissingEvent']);
  });
});

describe('Events referencing events', () => {
  const defs: EventDefSet = {
    SimpleEvent: 'SimpleSFX',
    ParentEvent: 'SimpleEvent',
  };
  const events = new EventManager(defs, graphMock);

  test('ParentEvent recurses to child', () => {
    events.execute('ParentEvent');
    expect(playedSfx).toEqual(['SimpleSFX']);
  });
});

describe('A simple shuffle', () => {
  const defs: EventDefSet = {
    SimpleShuffle: {
      shuffle: ['a', 'b', 'c', 'd'],
    },
    d: 'e',
  };
  const events = new EventManager(defs, graphMock, random);

  test('Selection follows random number generator', () => {
    nextRandom = 0;
    events.execute('SimpleShuffle');
    nextRandom = 2 / 4;
    events.execute('SimpleShuffle');
    nextRandom = 1 / 4;
    events.execute('SimpleShuffle');
    expect(playedSfx).toEqual(['a', 'c', 'b']);
  });

  test('Selection is recursive', () => {
    nextRandom = 0.99;
    events.execute('SimpleShuffle');
    expect(playedSfx).toEqual(['e']);
  });
});

describe('A simple cycle', () => {
  const defs: EventDefSet = {
    SimpleCycle: {
      cycle: ['a', 'b', 'c', 'd'],
    },
    d: 'e',
  };

  test('Cycle runs in order', () => {
    const events = new EventManager(defs, graphMock);
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    expect(playedSfx).toEqual(['a', 'b', 'c']);
  });

  test('Cycle recurses', () => {
    const events = new EventManager(defs, graphMock);
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    expect(playedSfx).toEqual(['a', 'b', 'c', 'e']);
  });

  test('Cycle cycles', () => {
    const events = new EventManager(defs, graphMock);
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    events.execute('SimpleCycle');
    expect(playedSfx).toEqual(['a', 'b', 'c', 'e', 'a', 'b', 'c', 'e']);
  });
});

describe('A simple selection', () => {
  const defs: EventDefSet = {
    SimpleSelect: {
      select: {
        'x == 0': 'a',
        'x == 1': 'b',
        'x == 2': 'c',
        'x == 4': 'd',
        'x >= 2': 'g',
        'obj.prop == 0': 'f',
      },
    },
    d: 'e',
  };
  const events = new EventManager(defs, graphMock);

  test('Select based on variable value', () => {
    events.execute('SimpleSelect', { x: 0 });
    events.execute('SimpleSelect', { x: 1 });

    expect(playedSfx).toEqual(['a', 'b']);
  });

  test('Nested variables', () => {
    events.execute('SimpleSelect', { x: -1, obj: { prop: 0 } });
    expect(playedSfx).toEqual(['f']);
  });

  test('No valid values plays nothing', () => {
    events.execute('SimpleSelect', { x: -1, obj: { prop: 1 } });
    expect(playedSfx).toHaveLength(0);
  });

  test('Only first valid condition is played', () => {
    events.execute('SimpleSelect', { x: 2 });
    expect(playedSfx).toEqual(['c']);
  });

  test('Select recuses', () => {
    events.execute('SimpleSelect', { x: 4 });
    expect(playedSfx).toEqual(['e']);
  });
});
