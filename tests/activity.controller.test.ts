const { createActivity } = require('../controllers/activity.controller');
const db = require('../models');
import * as fs from "fs";
const path = require('path');

// Mock Sequelize Models
jest.mock('../models');
jest.mock('fs');

describe('createActivity controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 1,
            body: {
                event_name: 'Kajian Subuh',
                event_description: 'Kajian subuh bersama ustadz',
                start_date: '2025-06-15',
                end_date: '2025-06-15',
                start_time: '05:00',
                end_time: '06:00',
            },
            file: { filename: 'kajian.jpg' }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Reset semua mock
        jest.clearAllMocks();
    });

    it('should create a new activity successfully', async () => {
        const fakeUser = { id: 1, mosque_id: 10 };
        const fakeActivity = { id: 123, ...req.body };

        db.user.findByPk.mockResolvedValue(fakeUser);
        db.activity.create.mockResolvedValue(fakeActivity);

        await createActivity(req, res);

        expect(db.user.findByPk).toHaveBeenCalledWith(req.userId);
        expect(db.activity.create).toHaveBeenCalledWith(expect.objectContaining({
            mosque_id: fakeUser.mosque_id,
            user_id: req.userId,
            event_name: req.body.event_name,
            image: '/uploads/kajian.jpg',
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(fakeActivity);
    });

    it('should return 404 if user not found and delete uploaded file', async () => {
        db.user.findByPk.mockResolvedValue(null);

        await createActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });

        const deletedPath = path.join('uploads', req.file.filename);
        expect(fs.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/uploads[\\/]+kajian\.jpg/),
            expect.any(Function)
        );
    });

    it('should return 500 if Activity.create throws error', async () => {
        const fakeUser = { id: 1, mosque_id: 10 };
        db.user.findByPk.mockResolvedValue(fakeUser);
        db.activity.create.mockRejectedValue(new Error('DB error'));

        await createActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to create activity' });

        expect(fs.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/uploads[\\/]+kajian\.jpg/),
            expect.any(Function)
        );

    });

    it('should return 400 if Multer file type error thrown', async () => {
        const fakeUser = { id: 1, mosque_id: 10 };
        db.user.findByPk.mockResolvedValue(fakeUser);
        const multerError = new Error("Hanya file JPEG, JPG, PNG yang diizinkan!");
        db.activity.create.mockImplementation(() => { throw multerError });

        await createActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: multerError.message });

        expect(fs.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/uploads[\\/]+kajian\.jpg/),
            expect.any(Function)
        );
    });
});
