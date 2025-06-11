const { verifyToken } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const roomController = require('../controllers/room.controller');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'x-access-token, Origin, Content-Type, Accept'
        );
        next();
    });

    // Room routes admin
    app.post("/api/rooms", verifyToken, upload.single("image"), roomController.createRoom); // Menambah ruangan, memerlukan verifikasi token	
    app.get("/api/rooms", verifyToken, roomController.getRooms); // Menampilkan daftar ruangan (dengan sorting dan search)
    app.get("/api/rooms/:id", verifyToken, roomController.getRoomById); // Menampilkan detail ruangan berdasarkan ID 
    app.put("/api/rooms/:id", verifyToken, upload.single("image"), roomController.updateRoom); // Mengedit ruangan, memerlukan verifikasi token
    app.delete("/api/rooms/:id", verifyToken, roomController.deleteRoom); // Menghapus ruangan, memerlukan verifikasi token
    
    // Room routes guest
    app.get("/api/guest/rooms/:slug", roomController.getPublicRooms); // Menampilkan daftar ruangan untuk tamu
    app.get("/api/guest/rooms/:slug/:room_id", roomController.getPublicRoomById); // Menampilkan detail ruangan untuk tamu berdasarkan ID
}