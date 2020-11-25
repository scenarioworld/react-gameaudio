import { AudioJSON } from "../../dist";

declare module "*.audio.json" {
    const value: AudioJSON;
    export default value;
}