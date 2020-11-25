import { AudioPackage } from "../../.";

const allAudioFiles: Record<string, string> = require("./*.mp3");

const ExampleAudioPackage: AudioPackage = { 
    definitions: require("./example.audio.json"),
    resolver: (filename: string) => allAudioFiles[filename.replace(".mp3", "")]
};

export default ExampleAudioPackage;