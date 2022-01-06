import { AudioDef, AudioDefSet, AudioFileResolver, AudioJSON } from './json';
import MusicPlayer from './music';

interface Await {
  resolve: (buffer: AudioBuffer) => void;
  reject: (reason: string) => void;
}

/**
 * Initializes and manages the audio graph (context, nodes, etc.)
 * and handles asynchronous loading of audio files
 */
export class AudioGraph {
  // Audio context
  private readonly context: AudioContext;

  // All music runs through this gain. Could be used later to adjust music volume?
  private readonly musicGain: GainNode;

  // Music player
  private readonly musicPlayer: MusicPlayer;

  // Active sfx nodes
  private readonly sfxNodes: AudioNode[] = [];

  // Queue of audio to load
  readonly loadQueue: string[] = [];

  // Set of failed audio assets
  readonly failed: string[] = [];

  // Currently loading asset
  private loading: string | null = null;

  // Audio buffers
  private readonly buffers: Record<string, AudioBuffer> = {};

  // Awaits: people waiting on buffer loads
  private readonly awaits: Record<string, Await[]> = {};

  // Loaded audio JSON data
  private readonly data: AudioJSON;

  // Function that maps filenames to real file URLs
  private readonly resolver: AudioFileResolver;

  /**
   * All audio graph initialization goes here
   * @param data Audio setup data
   * @param assetResolver Resolves files from the JSON into real filenames
   * @param context Pre-existing context to use (otherwise we make our own)
   */
  constructor(
    data: AudioJSON,
    assetResolver: AudioFileResolver,
    context?: AudioContext
  ) {
    // Set data
    this.data = data;
    this.resolver = assetResolver;

    // Initialize audio context
    this.context = context ?? AudioGraph.CreateAudioContext();

    // Create root music gain node
    this.musicGain = this.context.createGain();
    this.musicGain.connect(this.context.destination);

    // Create the music player class and route it through the music gain
    this.musicPlayer = new MusicPlayer(this.context, this.musicGain);

    // Add all defs to the load queue
    this.queueLoadSet(this.data.music);
    this.queueLoadSet(this.data.sfx);

    // Start loading
    this.loadNext();
  }

  /** Creates a new properly configured audio context object */
  static CreateAudioContext(): AudioContext {
    return new AudioContext();
  }

  // Used so the play method can track if another play is called while it's loading
  private playtoken: Record<never, never> | undefined = undefined;

  /**
   * Loads and begins playing the selected music track
   * @param id Music ID
   */
  async playmusic(id: string): Promise<void> {
    // Create a new play token to check if anyone else tries to play while we're loading
    const token = (this.playtoken = {});

    // Load audio buffer for this track
    const buffer = await this.getBuffer(id, true);
    if (!buffer) {
      return;
    }

    // If someone else tried to play before we got here, cancel us
    if (token !== this.playtoken) {
      return;
    }
    this.playtoken = undefined;

    // Tell the music player to play this song
    this.musicPlayer.playTrack(buffer);
  }

  /** Stops currently playing music if any is playing */
  stopmusic(): void {
    this.musicPlayer.stopTrack();
  }

  /** Change fade timing in the cross fader */
  setFadeTime(fadeTime: number): void {
    this.musicPlayer.fadeTime = fadeTime;
  }

  /**
   * Loads and plays a one of sound effect
   * @param id SFX id
   */
  async playsfx(id: string): Promise<void> {
    // Load audio buffer for this track
    const buffer = await this.getBuffer(id, true);
    if (!buffer) {
      console.error(`Can't find SFX cue ${id}.`);
      return;
    }

    // Create node and load in the buffer
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // Queue removal on end
    this.sfxNodes.push(source);
    source.onended = this.sfxComplete.bind(this, source);

    // Connect to output
    source.connect(this.context.destination);
    source.start(0);
  }

  // Cleans up sfx node when it is done
  private sfxComplete(node: AudioNode) {
    // Splice from array
    const index = this.sfxNodes.indexOf(node);
    if (index >= 0) {
      node.disconnect();
      this.sfxNodes.splice(index, 1);
    }
  }

  /**
   * Loads the buffer for the given ID (asyncronous)
   * @param id Audio ID
   * @returns A promise that resolves to an HTML5 AudioBuffer
   */
  getBuffer(id: string, priority = true): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      // Use load queue function
      this.queueLoad(id, { resolve, reject }, priority);
    });
  }

  /** Shuts down the audio graph */
  shutdown(): void {
    // Close audio context
    this.context.close();
  }

  private loadNext() {
    // Nothing to do if queue is empty
    if (this.loadQueue.length === 0) {
      return;
    }

    // Make sure we're not already loading something
    if (this.loading !== null) {
      console.warn(
        `AudioGraph.loadNext called but we're already loading ${this.loading}.`
      );
      return;
    }

    // Grab next item from the queue and set is as the currently loading item
    [this.loading] = this.loadQueue.splice(0, 1);

    // Get def
    const def = this.getDef(this.loading);
    if (!def) {
      console.error(
        `Failed to find audio defintinition for ${this.loading} in JSON. Cancelling load`
      );

      // Move on
      this.loading = null;
      this.loadNext();
      return;
    }

    const filename = this.get_filename(def.file);
    if (!filename) {
      console.error(
        `Failed to find audio filename for ${def.file}. Cancelling load`
      );

      // Move on
      this.loading = null;
      this.loadNext();
      return;
    }

    // Create HTTP request
    const request = new XMLHttpRequest();
    request.open('GET', filename, true);
    request.responseType = 'arraybuffer';

    console.log(`Beginning request for ${this.loading} (${def.file}).`);

    // Setup onload callback. This is called when the file is loaded.
    const loading = this.loading;
    request.onload = () => {
      // Decode audio data with context
      this.context.decodeAudioData(
        request.response,
        buffer => {
          // If the buffer is null, we couldn't process this file
          if (!buffer) {
            console.error(`Error decoding audio data from ${def.file}.`);
            this.loadComplete(false);
            return;
          }

          // Set buffer
          this.buffers[loading] = buffer;
          console.log(`Loaded ${loading} (${def.file}) successfully.`);

          // Complete! Load next file
          this.loadComplete(true);
        },
        error => {
          console.error(
            `decodeAudioData error for file ${def.file}: ${error}.`
          );
          this.loadComplete(false);
        }
      );
    };

    // Setup onerror callback
    request.onerror = () => {
      console.error(`Error sending request for file ${def.file}.`);
      this.loadComplete(false);
    };

    // Send HTTP request
    request.send();
  }

  private loadComplete(success: boolean): void {
    if (!this.loading) {
      console.warn('loadComplete called but no file is loading.');
      return;
    }

    // If failed, add to fail list
    if (!success) {
      this.failed.push(this.loading);
    }

    // Call all awaits
    const awaits = this.awaits[this.loading];
    if (awaits) {
      for (const callback of awaits) {
        if (success) {
          callback.resolve(this.buffers[this.loading]);
        } else {
          callback.reject('Load failed');
        }
      }
      delete this.awaits[this.loading];
    }

    // Load next file
    this.loading = null;
    this.loadNext();
  }

  private getDef(id: string): AudioDef | undefined {
    return this.data.music?.[id] ?? this.data.sfx?.[id];
  }

  private queueLoadSet(defs?: AudioDefSet) {
    if (!defs) {
      return;
    }

    // Sort by loading priority
    const sortedDefs = Object.keys(defs)
      .map(id => ({ id, def: defs[id] }))
      .sort((a, b) => (a.def.priority ?? 200) - (b.def.priority ?? 200));

    for (const def of sortedDefs) {
      // Load using non-priority setting so each is just appended to the end of the queue
      this.queueLoad(def.id, undefined, false);
    }
  }

  private queueLoad(id: string, response?: Await, priority = true) {
    // Already loaded
    if (id in this.buffers) {
      response?.resolve(this.buffers[id]);
      return;
    }

    // Already failed
    if (this.failed.includes(id)) {
      response?.reject('Loading failed');
      return;
    }

    // Add response to await queue
    if (response) {
      if (!(id in this.awaits)) {
        this.awaits[id] = [];
      }
      this.awaits[id].push(response);
    }

    // If already loading, do nothing
    if (this.loading === id) {
      return;
    }

    // High priority
    if (priority) {
      // If it's alraedy in the loading queue, remove it
      const index = this.loadQueue.indexOf(id);
      if (index !== -1) {
        this.loadQueue.splice(index, 1);
      }

      // Add to the top of the loading queue
      this.loadQueue.splice(0, 0, id);
    } else {
      // Low priority. If not in the queue, add to the end. Otherwise leave where it is
      if (!this.loadQueue.includes(id)) {
        this.loadQueue.push(id);
      }
    }
  }

  /** Gets the final, production filename of an audio file */
  private get_filename(file: string): string | undefined {
    return this.resolver(file);
  }
}
