import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import fs from "fs";
import next from "next";
import path from "path";
import cors from "cors";
import multer from "multer";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app
  .prepare()
  .then(() => {
    const server = express();
    const httpServer = createServer(server);
    const io = new SocketIOServer(httpServer);

    server.use(
      cors({
        // origin: "*",
        origin: "http://localhost:3000",
      })
    );

    server.use(express.json());
    server.use(express.urlencoded({ extended: true }));
    server.use("/uploads", express.static("uploads"));

    const storage = multer.diskStorage({
      destination: function (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
      ) {
        cb(null, "./uploads");
      },
      filename: function (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
      ) {
        cb(
          null,
          file.fieldname + "-" + uuidv4() + path.extname(file.originalname)
        );
      },
    });

    const upload = multer({ storage: storage });

    server.post(
      "/upload",
      upload.single("file"),
      function (req: Request, res: Response) {
        const lessonId = uuidv4();
        const videoPath = req.file?.path;
        const outputPath = `./uploads/courses/${lessonId}`;
        const hlsPath = `${outputPath}/index.m3u8`;

        if (!fs.existsSync(outputPath)) {
          fs.mkdirSync(outputPath, { recursive: true });
        }
        // ffmpeg
        const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

        // no queue because of POC, not to be used in production
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            return console.log(`exec error: ${error}`);
          }
          const videoUrl = `/uploads/courses/${lessonId}/index.m3u8`;
          res.json({
            message: "Video converted to HLS format",
            videoUrl: videoUrl,
            lessonId: lessonId,
          });
        });
      }
    );

    io.on("connection", (socket: Socket) => {
      console.log("User Socket Id :", socket.id);

      socket.on("disconnect", () => {
        console.log("User disconnected");
      });

      socket.on("message", (msg: string) => {
        console.log("Message received: " + msg);
        socket.emit("message", "Server received: " + msg);
      });
    });

    // Handle all other routes with Next.js
    server.all("*", (req: Request, res: Response) => {
      return handle(req, res);
    });

    httpServer.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err: any) => {
    console.error("Error starting server :", err);
  });
