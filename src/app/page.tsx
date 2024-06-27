"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import "./globals.css";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

interface VideoPlayerProps {
  url: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = () => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   if (event.target.files) {
  //     setFile(event.target.files[0]);
  //   }
  // };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = () => {
        if (reader.readyState === FileReader.DONE) {
          setFile(selectedFile);
        }
      };
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setUrl(data.videoUrl);
    } catch (error) {
      console.error("Error uploading file :", error);
    }
  };
  return (
    <div className="container">
      <h1>Video player</h1>

      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} accept="video/*" />
        <button type="submit">Upload</button>
      </form>

      {url && (
        <div style={{ maxWidth: "600px" }}>
          <ReactPlayer
            url={url}
            controls={true}
            width="100%"
            height="auto"
            config={{
              file: {
                forceHLS: true,
                attributes: {
                  controlsList: "nodownload",
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
