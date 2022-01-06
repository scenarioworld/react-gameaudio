import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import GameAudioPlayer from '../.';
import ExampleAudioPackage from './audio';

const App = () => {
  const [musicId, setMusicId] = React.useState<string|null>(null);
  const [sfxQueue, setSFXQueue] = React.useState<string[]>([]);
  const [num, setNum] = React.useState(5);

  const clearSFXQueue = React.useCallback(() => setSFXQueue([]), []);
  const playSFX = React.useCallback((sfx: string) => setSFXQueue(queue => [...queue, sfx]), []);

  return (
    <div>
      <button onClick={() => setMusicId("song")}>Play Song A</button>
      <button onClick={() => setMusicId("musicbox")}>Play Song B</button>
      <button onClick={() => playSFX("beep")}>Beep</button>
      <button onClick={() => setNum(n => n == 0 ? 5 : 0)}>Toggle Num</button>
      <button onClick={() => playSFX("beepA")}>Beep Shuffle</button>
      <button onClick={() => setMusicId(null)}>Stop</button>
      <GameAudioPlayer package={ExampleAudioPackage} music_id={musicId} sfx_queue={sfxQueue} clearSFXQueue={clearSFXQueue} fade_time={1} variables={{"test": num}} />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
