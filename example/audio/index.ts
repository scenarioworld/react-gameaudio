import { AudioPackage } from "../../.";

const mp3AudioFiles: Record<string, string> = require("./*.mp3");
const wavAudioFiles: Record<string, string> = require("./*.wav");

const ExampleAudioPackage: AudioPackage = { 
    definitions: require("./example.audio.json"),
    resolver: (filename: string) => mp3AudioFiles[filename.replace(".mp3", "")] ?? wavAudioFiles[filename.replace(".wav", "")]
};

export default ExampleAudioPackage;