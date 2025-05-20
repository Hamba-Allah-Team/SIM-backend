const { verifyToken } = require('../middleware/auth.middleware');
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
    app.post("/api/rooms", verifyToken, roomController.createRoom); // Menambah ruangan, memerlukan verifikasi token
    app.get("/api/rooms", verifyToken, roomController.getRooms); // Menampilkan daftar ruangan (dengan sorting dan search)
    app.get("/api/rooms/:id", verifyToken, roomController.getRoomById); // Menampilkan detail ruangan berdasarkan ID 
    app.put("/api/rooms/:id", verifyToken, roomController.updateRoom); // Mengedit ruangan, memerlukan verifikasi token
    app.delete("/api/rooms/:id", verifyToken, roomController.deleteRoom); // Menghapus ruangan, memerlukan verifikasi token
    
    // Room routes guest
    // app.post("/api/rooms/guest", roomController.createPublicRoom); // Menambah ruangan dengan akses publik
    // app.get("/api/rooms/guest/:mosque_id", roomController.getPublicRoom); // Ambil semua ruangan publik berdasarkan mosque_id
    // app.get("/api/rooms/guest/:mosque_id/:id", roomController.getPublicRoomById); // Ambil 1 ruangan publik berdasarkan mosque_id dan id
}