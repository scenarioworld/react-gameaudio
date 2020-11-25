import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import GameAudioPlayer from '../.';
import ExampleAudioPackage from './audio';

const App = () => {
  const [musicId, setMusicId] = React.useState<string|null>(null);

  return (
    <div>
      <button onClick={() => setMusicId("song")}>Play Song A</button>
      <button onClick={() => setMusicId("musicbox")}>Play Song B</button>
      <button onClick={() => setMusicId(null)}>Stop</button>
      <GameAudioPlayer package={ExampleAudioPackage} music_id={musicId} clearSFXQueue={() => {}} fade_time={1} />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
