/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/consistent-type-assertions*/
import { AudioJSON } from '../src/json';
import { AudioGraph } from '../src/graph';
import { createConstructorMock, _stub } from './mock';

describe('A Basic Audio Graph', () => {
  function mockResolver(file: string) {
    return 'assets/' + file;
  }
  const mockJSON: AudioJSON = {
    music: {
      track1: { file: 'track1.wav', priority: 1 },
      track2: { file: 'track2.wav', priority: 0 },
      track3: { file: 'track3.wav', priority: 5 },
    },
  };

  const contextMock = createConstructorMock(<AudioContext>_stub, () => ({
    decodeAudioData: jest.fn((response, success, error) => {
      const data = (response as unknown) as string;
      if (data && data.endsWith(':RESPONSE')) {
        setTimeout(
          () => success?.(({ data: data + ':DATA' } as unknown) as AudioBuffer),
          500
        );
      } else {
        error?.(
          new DOMException(
            'Unexpected response data. Mock expects a string ending with :RESPONSE'
          )
        );
      }

      return (null as unknown) as Promise<AudioBuffer>;
    }),

    createGain: jest.fn(() => {
      return ({
        connect: () => {
          return;
        },
      } as unknown) as GainNode;
    }),
  }));

  const requestMock = createConstructorMock(<XMLHttpRequest>_stub, function() {
    const me: Partial<XMLHttpRequest> & { secretURL?: string } = {};
    me.open = jest.fn((_method, url) => (me.secretURL = url));
    me.send = jest.fn(() => {
      setTimeout(() => {
        //@ts-ignore
        me.response = me.secretURL + ':RESPONSE';
        //@ts-ignore
        me.onload?.((null as unknown) as ProgressEvent<EventTarget>);
      }, 500);
    });
    return me;
  });

  //@ts-ignore
  window.AudioContext = contextMock.constructor;

  //@ts-ignore
  window.XMLHttpRequest = requestMock.constructor;

  // Console error mocking
  const err = console.error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockErr: jest.Mock<void, any>;
  beforeEach(() => {
    mockErr = jest.fn((...data) => err(...data));
    console.error = mockErr;
  });
  afterEach(() => {
    console.error = err;
  });

  // Create audio graph with mocks
  let graph: AudioGraph;
  beforeEach(() => (graph = new AudioGraph(mockJSON, mockResolver)));

  const expectedData = (id: string) => ({
    data: `assets/${mockJSON.music?.[id].file}:RESPONSE:DATA`,
  });

  test('Test loading a single track', async () => {
    await expect(graph.getBuffer('track1')).resolves.toEqual(
      expectedData('track1')
    );
    expect(mockErr.mock.calls).toHaveLength(0);
  });

  test('Load multiple tracks', async () => {
    await expect(graph.getBuffer('track1')).resolves.toEqual(
      expectedData('track1')
    );
    await expect(graph.getBuffer('track2')).resolves.toEqual(
      expectedData('track2')
    );
    expect(mockErr.mock.calls).toHaveLength(0);
  });

  test('Tracks load in priority order', async () => {
    // Load tracks without modifying their priority
    const trackOne = graph.getBuffer('track1', false).then(() => order.push(1));
    const trackTwo = graph.getBuffer('track2', false).then(() => order.push(2));
    const trackThree = graph
      .getBuffer('track3', false)
      .then(() => order.push(3));

    // Have them register when they are finished and wait
    const order: number[] = [];
    await expect(trackOne).resolves.toBeDefined();
    await expect(trackTwo).resolves.toBeDefined();
    await expect(trackThree).resolves.toBeDefined();

    // Order should be [2, 1, 3] (order of priorities in json)
    expect(order).toEqual([2, 1, 3]);
    expect(mockErr.mock.calls).toHaveLength(0);
  });

  test('Requests override priority order', async () => {
    // Load tracks without modifying their priority
    const trackOne = graph.getBuffer('track1', true).then(() => order.push(1));
    const trackTwo = graph.getBuffer('track2', true).then(() => order.push(2));
    const trackThree = graph
      .getBuffer('track3', true)
      .then(() => order.push(3));

    // Have them register when they are finished and wait
    const order: number[] = [];
    await expect(trackOne).resolves.toBeDefined();
    await expect(trackTwo).resolves.toBeDefined();
    await expect(trackThree).resolves.toBeDefined();

    // Order should be [2, 3, 1] based on what was requested most recently
    expect(order).toEqual([2, 3, 1]);
    expect(mockErr.mock.calls).toHaveLength(0);
  });

  test('All requests return the same buffer', async () => {
    const buffers: AudioBuffer[] = [];

    // Load track 3 ten times
    for (let i = 0; i < 10; i++) {
      await expect(
        graph.getBuffer('track3', true).then(b => buffers.push(b))
      ).resolves.toBeDefined();
    }

    // Make sure all buffers in the array are identical
    expect(buffers).toHaveLength(10);
    for (let i = 0; i < buffers.length - 1; i++) {
      expect(buffers[i]).toBe(buffers[i + 1]);
    }
  });
});
