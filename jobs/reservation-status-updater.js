const cron = require("node-cron");
const db = require("../models/index.js");
const { Op } = require("sequelize");
const Reservation = db.reservation;

const updateReservationStatus = async () => {
    console.log("Starting reservation status update...");

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the start of the day

        const [rejectedCount] = await Reservation.update(
            { status: 'rejected' },
            {
                where: {
                    status: 'pending',
                    reservation_date: {
                        [Op.lt]: today // Update reservations with date before today
                    }
                }
            }
        );

        if (rejectedCount > 0) {
            console.log(`${rejectedCount} pending reservations have been rejected due to past dates.`);
        }

        const [completedCount] = await Reservation.update(
            { status: 'completed' },
            {
                where: {
                    status: 'approved',
                    reservation_date: today // Update reservations with today's date
                }
            }
        );

        if (completedCount > 0) {
            console.log(`${completedCount} approved reservations have been marked as completed.`);
        }
    } catch (error) {
        console.error("Error updating reservation statuses:", error);
    }
};

cron.schedule("1 0 * * *", updateReservationStatus, {
    timezone: "Asia/Jakarta"
});