import { useEffect, useRef } from 'react';
import { EventManager } from '../event';
import { AudioGraph } from '../graph';
import { AudioPackage, Variables } from '../json';

interface Properties {
  /** Audio package. Required. Do not change this after mount. */
  package: AudioPackage;

  /** ID of the piece of music to play */
  music_id?: string | null;

  /** List of SFX cues or events to play */
  sfx_queue?: string[];

  /** Number of seconds to use when fading */
  fade_time?: number;

  /** Variable values piped into the event system */
  variables?: Variables;

  /** Callback that tells the parent that the SFX queue has been played and should be cleared */
  clearSFXQueue: () => void;
}

/**
 * Audio Player component. Responsible for rendering the audio from the current audio state
 */
export function GameAudioPlayer(props: Properties): JSX.Element | null {
  // Create refs
  const audioGraphRef = useRef<AudioGraph | undefined>(undefined);
  const eventManagerRef = useRef<EventManager | undefined>(undefined);

  // Cache package
  const audioPackage = useRef(props.package);

  // Make sure variables are available in our useEffect callback
  const variableAccess = useRef(props.variables);
  variableAccess.current = props.variables;

  // Schedule audio graph initialization.
  // Will run exactly once after the first render
  useEffect(() => {
    // Create audio graph
    audioGraphRef.current = new AudioGraph(
      audioPackage.current.definitions,
      audioPackage.current.resolver
    );

    // Create event manager
    eventManagerRef.current = new EventManager(
      audioPackage.current.definitions.events,
      audioGraphRef.current
    );

    // Returning a function from useEffect schedules it to run when the component dies
    return () => audioGraphRef.current?.shutdown();
  }, []);

  // Fade time changes
  useEffect(() => {
    if (props.fade_time) {
      audioGraphRef.current?.setFadeTime(props.fade_time);
    }
  }, [props.fade_time]);

  // Schedule changes to currently playing track
  useEffect(() => {
    if (props.music_id) {
      audioGraphRef.current?.playmusic(props.music_id);
    } else {
      audioGraphRef.current?.stopmusic();
    }
  }, [props.music_id]);

  // Handle SFX queue
  const queue = props.sfx_queue;
  const clearSFXQueue = props.clearSFXQueue;
  useEffect(() => {
    // Make sure audio graph is valid
    if (!audioGraphRef.current || !eventManagerRef.current) {
      return;
    }

    if (queue) {
      // Play every SFX in queue
      for (const sfx of queue) {
        eventManagerRef.current.execute(sfx, variableAccess.current);
      }

      // Clear queue
      if (queue.length > 0) {
        clearSFXQueue();
      }
    }
  }, [queue, clearSFXQueue]);

  return null;
}
