const { verifyToken } = require('../middleware/auth.middleware');
const reservationController = require('../controllers/reservation.controller');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'x-access-token, Origin, Content-Type, Accept'
        );
        next();
    });

    // Reservation routes admin
    app.post("/api/reservations", verifyToken, reservationController.createReservation); // Menambah reservasi, memerlukan verifikasi token
    app.get("/api/reservations", verifyToken, reservationController.getReservations); // Menampilkan daftar reservasi (dengan sorting dan search)
    app.get("/api/reservations/:id", verifyToken, reservationController.getReservationById); // Menampilkan detail reservasi berdasarkan ID 
    app.put("/api/reservations/:id", verifyToken, reservationController.updateReservation); // Mengedit reservasi, memerlukan verifikasi token
    app.put("/api/reservations/:id/:status", verifyToken, reservationController.approveReservation); // Mengupdate status reservasi, memerlukan verifikasi token
    app.delete("/api/reservations/:id", verifyToken, reservationController.deleteReservation); // Menghapus reservasi, memerlukan verifikasi token

    // Reservation routes guest
    // app.post("/api/reservations/guest", reservationController.createPublicReservation);
}