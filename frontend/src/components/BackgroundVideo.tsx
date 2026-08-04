

export function BackgroundVideo({ src }: { src?: string }) {
  const videoSrc = src || "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_031045_0e1165dd-ab48-46e3-ad3d-5fe77f217647.mp4";
  
  return (
    <>
      <video
        className="object-cover w-full h-full fixed top-0 left-0 -z-20"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className="fixed top-0 left-0 w-full h-full bg-black/60 -z-10" />
    </>
  );
}
