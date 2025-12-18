
/**
 * Extracts audio from a video file completely within the browser.
 * Returns a WAV Blob and duration.
 */
export async function extractAudioInBrowser(videoFile: File): Promise<{ blob: Blob; duration: number }> {
    // 1. Create AudioContext
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();

    // 2. Decode Video Audio
    const arrayBuffer = await videoFile.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // 3. Convert to WAV
    const wavBlob = audioBufferToWav(audioBuffer);

    return {
        blob: wavBlob,
        duration: audioBuffer.duration
    };
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const outBuffer = new ArrayBuffer(length);
    const view = new DataView(outBuffer);
    const channels = [];
    let sample;
    let offset = 0;
    let pos = 0;

    // Helper to write strings
    const writeString = (s: string) => {
        for (let i = 0; i < s.length; i++) {
            view.setUint8(pos++, s.charCodeAt(i));
        }
    };

    // write RIFF chunk descriptor
    writeString("RIFF");
    view.setUint32(pos, length - 8, true); pos += 4;
    writeString("WAVE");

    // write fmt sub-chunk
    writeString("fmt ");
    view.setUint32(pos, 16, true); pos += 4; // subchunk1 size
    view.setUint16(pos, 1, true); pos += 2; // PCM
    view.setUint16(pos, numOfChan, true); pos += 2;
    view.setUint32(pos, buffer.sampleRate, true); pos += 4;
    view.setUint32(pos, buffer.sampleRate * 2 * numOfChan, true); pos += 4; // byte rate
    view.setUint16(pos, numOfChan * 2, true); pos += 2; // block align
    view.setUint16(pos, 16, true); pos += 2; // bits per sample

    // write data sub-chunk
    writeString("data");
    view.setUint32(pos, length - pos - 4, true); pos += 4;

    // write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            // interleave channels
            // clamp
            sample = Math.max(-1, Math.min(1, channels[i][offset] || 0));
            // scale to 16-bit signed int
            sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([outBuffer], { type: 'audio/wav' });
}
