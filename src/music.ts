/**
 * Reusable music player class. Uses fades when you play a new song.
 * Is supplied a context and a destination by its parent.
 */
export default class MusicPlayer {
  /** Context given to us by our creator */
  private readonly context: AudioContext;

  /** Destination to route music to. This could be the speakers, or some other gain or effect node. We don't care. */
  private readonly destination: AudioNode;

  // Not sure what this does? No one ever sets it so it's always zero
  private startOffset = 0;

  /** Audio source playing the latest buffer we've been asked to play */
  private currentSource: AudioBufferSourceNode | undefined;

  /** Root gain node to which everything is currently connected. */
  private currentGain: GainNode | undefined;

  /** Number of seconds to fade out songs for when changing or stopping */
  public fadeTime: number = 4;

  /**
   * Creates a new music player that can fade between songs
   * @param context Parent audio context
   * @param destination Destination to route music to
   */
  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.destination = destination;
  }

  /**
   * Plays an audio buffer, cross fading if appropriate
   * @param buffer Buffer to play
   */
  playTrack(buffer: AudioBuffer): void {
    // If we're playing nothing, trigger initial playback
    if (!this.currentGain) {
      this.initialPlayback(buffer);
    } else {
      // Create a new gain node
      const newGain = this.context.createGain();
      newGain.gain.setValueAtTime(1, this.context.currentTime);

      // repatch the board
      this.currentGain.disconnect();
      this.currentSource?.connect(this.currentGain);
      this.currentGain.connect(newGain);
      newGain.connect(this.destination);

      // magic numbers - 1: abrupt, 3: smooth, 6: gradual
      this.fadeOut(this.currentGain, this.fadeTime);
      this.currentGain = newGain;
      this.scheduleNextPlayback(
        buffer,
        this.currentGain,
        this.context.currentTime + this.fadeTime
      );
    }
  }

  /**
   * Fade out the current song
   */
  stopTrack(): void {
    // If no current gain, nothing to stop!
    if (!this.currentGain) {
      return;
    }

    // Fade out the current gain node
    this.fadeOut(this.currentGain, this.fadeTime);

    // Clear out all our variables
    this.currentGain = undefined;
    this.currentSource = undefined;
  }

  private scheduleNextPlayback(
    buffer: AudioBuffer,
    gain: GainNode,
    startTime = 0
  ): void {
    // Create new source for buffer
    this.currentSource = this.context.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.loop = true;
    this.currentSource.start(startTime);

    // Connect to the parent gain
    this.currentSource.connect(gain);
  }

  private fadeOut(gain: GainNode, interval: number) {
    gain.gain.setValueAtTime(gain.gain.value, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.context.currentTime + interval
    );

    // Schedule a disconnection after the interval
    setTimeout(() => gain.disconnect(), interval * 1000);
  }

  private initialPlayback(buffer: AudioBuffer, startTime = 0): void {
    // If we're not playing anything at all
    if (!this.currentGain) {
      // Create source
      this.currentSource = this.context.createBufferSource();
      this.currentSource.buffer = buffer;
      this.currentSource.loop = true;

      // Create gain that will later be used to fade this source out
      this.currentGain = this.context.createGain();

      // Connect source to gain
      this.currentSource.connect(this.currentGain);

      // Connect gain to destination
      this.currentGain.connect(this.destination);

      // Schedule playback
      if (startTime === 0) {
        startTime = this.context.currentTime;
      }
      this.currentSource.start(0, this.startOffset % buffer.duration);
    } else {
      console.warn('Initial playback already triggered. Ignoring.');
    }
  }
}
