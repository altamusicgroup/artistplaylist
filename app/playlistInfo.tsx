export default interface PlaylistInfo {
    playlistName: string;
    playlistDescription: string;
    playlistTrackIds: string[];
    backgroundImageUrl: string;
    socials: {
        instagram?: string;
        tiktok?: string;
        spotify?: string;
        youtube?: string;
        facebook?: string;
        twitter?: string;
    };
}
