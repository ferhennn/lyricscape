// Minimal ambient types for MusicKit JS v3 (https://js-cdn.music.apple.com/musickit/v3/).
// Only the surface LYRICSCAPE uses is declared.

export {};

declare global {
  interface Window {
    MusicKit?: MusicKitStatic;
    musicKitReady?: Promise<MusicKitStatic>;
  }

  interface MusicKitStatic {
    configure(config: MusicKitConfig): Promise<MusicKitInstance>;
    getInstance(): MusicKitInstance;
    PlaybackStates: Record<string, number> & Record<number, string>;
    PlayerRepeatMode: { none: number; one: number; all: number };
  }

  interface MusicKitConfig {
    developerToken: string;
    app: { name: string; build: string };
    storefrontId?: string;
  }

  interface MusicKitArtwork {
    url: string;
    width?: number;
    height?: number;
    bgColor?: string;
    textColor1?: string;
    textColor2?: string;
  }

  interface MusicKitResource {
    id: string;
    type: string;
    href?: string;
    attributes?: {
      name?: string;
      artistName?: string;
      albumName?: string;
      durationInMillis?: number;
      isrc?: string;
      previews?: Array<{ url: string }>;
      artwork?: MusicKitArtwork;
      releaseDate?: string;
      url?: string;
      playParams?: { id?: string; catalogId?: string; kind?: string };
    };
    relationships?: Record<string, { data: MusicKitResource[] }>;
  }

  interface MusicKitInstance {
    isAuthorized: boolean;
    musicUserToken?: string;
    storefrontId?: string;
    currentPlaybackTime: number;
    currentPlaybackDuration: number;
    currentPlaybackProgress: number;
    isPlaying: boolean;
    playbackState: number;
    volume: number;
    nowPlayingItem?: MusicKitResource;
    api: {
      music(
        path: string,
        params?: Record<string, string | number | string[]>,
      ): Promise<{ data: { data: MusicKitResource[]; results?: Record<string, { data: MusicKitResource[] }> } }>;
    };
    authorize(): Promise<string>;
    unauthorize(): Promise<void>;
    setQueue(opts: { song?: string; songs?: string[]; startPlaying?: boolean; startTime?: number }): Promise<unknown>;
    play(): Promise<void>;
    pause(): void;
    stop(): void;
    seekToTime(seconds: number): Promise<void>;
    mute(): void;
    unmute(): void;
    addEventListener(name: string, cb: (e: unknown) => void): void;
    removeEventListener(name: string, cb: (e: unknown) => void): void;
  }
}
