/**
 * Summary. Definition of audio types in audio.json
 */

/** Audio definition */
export interface AudioDef {
  /** Filename relative to audio.json */
  file: string;

  /** Loading priority */
  priority?: number;
}

/** Set of audio definitions */
export type AudioDefSet = Record<string, AudioDef>;

/** Root JSON object definition */
export interface AudioJSON {
  /** Music records */
  music?: AudioDefSet;

  /** SFX records */
  sfx?: AudioDefSet;
}

/** Resolves an audio filename, usually by calling require(). Should return a URI that can be passed to an XMLHttpRequest */
export type AudioFileResolver = (file: string) => string | undefined;

/**
 * Audio package including definitions and a resolver
 */
export interface AudioPackage {
  /** Audio definitions. Includes all music and SFX */
  definitions: AudioJSON;

  /** Resolves an audio filename, usually by calling require(). Should return a URI that can be passed to an XMLHttpRequest */
  resolver: AudioFileResolver;
}
