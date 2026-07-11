export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <title>?</title>
      <video
        id="ddanggang"
        autoPlay={true}
        muted={true}
        playsInline={true}
        src="https://i.imgur.com/wN5mzEW.mp4"
        onClick={() => {
          const video = document.getElementById("ddanggang");
          if (video instanceof HTMLVideoElement) {
            video.currentTime = 0;
            video.play();
          }
        }}
      ></video>
      <p>404 Not Found</p>
      <br />
      <p>KPJ ddanggang found</p>
    </div>
  );
}
