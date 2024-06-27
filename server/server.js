"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const fs_1 = __importDefault(require("fs"));
const next_1 = __importDefault(require("next"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const dev = process.env.NODE_ENV !== "production";
const app = (0, next_1.default)({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;
app
    .prepare()
    .then(() => {
    const server = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(server);
    const io = new socket_io_1.Server(httpServer);
    server.use((0, cors_1.default)({
        // origin: "*",
        origin: "http://localhost:3000",
    }));
    server.use(express_1.default.json());
    server.use(express_1.default.urlencoded({ extended: true }));
    server.use("/uploads", express_1.default.static("uploads"));
    const storage = multer_1.default.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "./uploads");
        },
        filename: function (req, file, cb) {
            cb(null, file.fieldname + "-" + (0, uuid_1.v4)() + path_1.default.extname(file.originalname));
        },
    });
    const upload = (0, multer_1.default)({ storage: storage });
    server.post("/upload", upload.single("file"), function (req, res) {
        var _a;
        const lessonId = (0, uuid_1.v4)();
        const videoPath = (_a = req.file) === null || _a === void 0 ? void 0 : _a.path;
        const outputPath = `./uploads/courses/${lessonId}`;
        const hlsPath = `${outputPath}/index.m3u8`;
        if (!fs_1.default.existsSync(outputPath)) {
            fs_1.default.mkdirSync(outputPath, { recursive: true });
        }
        // ffmpeg
        const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;
        // no queue because of POC, not to be used in production
        (0, child_process_1.exec)(ffmpegCommand, (error, stdout, stderr) => {
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
    });
    io.on("connection", (socket) => {
        console.log("User Socket Id :", socket.id);
        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
        socket.on("message", (msg) => {
            console.log("Message received: " + msg);
            socket.emit("message", "Server received: " + msg);
        });
    });
    // Handle all other routes with Next.js
    server.all("*", (req, res) => {
        return handle(req, res);
    });
    httpServer.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
    });
})
    .catch((err) => {
    console.error("Error starting server :", err);
});
