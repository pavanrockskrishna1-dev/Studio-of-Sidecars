/* Animation Studio (Phase 16B, Slice D1) — the MP4 writer adapter.
   ---------------------------------------------------------------------------
   The ONLY file that imports mediabunny, and only through a dynamic import(),
   so the library is a separate build chunk that never loads until an export
   starts (preloadMp4()).

   createMp4Writer() packs H.264 (WebCodecs) frames into an in-memory MP4 with
   the metadata (moov) in front of the media data ("fast start"), a constant
   frame rate and a key frame every second.

   Frame ownership: addFrame() is NOT an async function. It builds the
   VideoFrame from the canvas synchronously, in the caller's own task, so the
   caller can call it straight after stepExport() and still read the frame the
   renderer just drew (the drawing buffer is not preserved across tasks). Only
   then does it hand the frame to the encoder and return the promise that gives
   backpressure. */

let libPromise = null;
let lib = null;

// Starts loading mediabunny (a separate chunk). Safe to call more than once.
export function preloadMp4() {
  if (!libPromise) {
    libPromise = import("mediabunny").then(
      (m) => {
        lib = m;
        return m;
      },
      (err) => {
        libPromise = null; // allow a retry
        throw err;
      }
    );
  }
  return libPromise;
}

// Whether this browser can encode H.264 (High profile, level 4.0) at this
// size. Uses WebCodecs directly, so asking never loads the MP4 library.
export async function canEncode({ width, height, bitrate, fps = 30 }) {
  try {
    if (typeof VideoEncoder === "undefined") return false;
    const res = await VideoEncoder.isConfigSupported({
      codec: "avc1.640028",
      width,
      height,
      bitrate,
      framerate: fps,
      avc: { format: "avc" },
    });
    return res.supported === true;
  } catch {
    return false;
  }
}

// Requires preloadMp4() to have resolved. Returns { addFrame, finish, cancel }.
export function createMp4Writer({ width, height, fps, bitrate }) {
  if (!lib) throw new Error("The MP4 writer is not loaded yet (call preloadMp4 first).");
  const target = new lib.BufferTarget();
  const output = new lib.Output({
    format: new lib.Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const source = new lib.VideoSampleSource({
    codec: "avc",
    bitrate, // deprecated in favour of `quality` by the library, but exact
    keyFrameInterval: 1, // seconds: a key frame every fps frames
  });
  output.addVideoTrack(source, { frameRate: fps });
  const started = output.start();
  started.catch(() => {}); // surfaced through the first addFrame instead

  let done = false; // finished or canceled

  return {
    // Synchronously captures `canvas` as frame `index`; returns the promise
    // that resolves once the encoder and the writer can take more.
    addFrame(canvas, index) {
      if (done) return Promise.reject(new Error("The MP4 writer is closed."));
      if (canvas.width !== width || canvas.height !== height) {
        return Promise.reject(
          new Error(`The canvas is ${canvas.width}x${canvas.height}, expected ${width}x${height}.`)
        );
      }
      let frame = null;
      let sample = null;
      try {
        frame = new VideoFrame(canvas, {
          timestamp: Math.round((index * 1e6) / fps),
          duration: Math.round(1e6 / fps),
        });
        sample = new lib.VideoSample(frame, { timestamp: index / fps, duration: 1 / fps });
      } catch (err) {
        if (frame) frame.close();
        return Promise.reject(err);
      }
      const release = () => {
        try {
          sample.close();
        } catch {
          /* already closed */
        }
        try {
          frame.close();
        } catch {
          /* already closed */
        }
      };
      return started
        .then(() => source.add(sample))
        .then(release, (err) => {
          release();
          throw err;
        });
    },

    // Finalizes the file and returns it as a Blob (video/mp4).
    async finish() {
      if (done) throw new Error("The MP4 writer is closed.");
      done = true;
      try {
        await started;
        await output.finalize();
      } catch (err) {
        await output.cancel().catch(() => {});
        throw err;
      }
      return new Blob([target.buffer], { type: "video/mp4" });
    },

    // Safe at any time and more than once; closes the encoder. Never rejects.
    cancel() {
      if (done) return Promise.resolve();
      done = true;
      return Promise.resolve()
        .then(() => output.cancel())
        .catch(() => {});
    },
  };
}
