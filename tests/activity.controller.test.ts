const { createActivity, getActivities, getActivityById, deleteActivity } = require('../controllers/activity.controller');
const dbActivity = require('../models');
import * as fs from "fs";
const path = require('path');

// Mock Sequelize Models dan fs
jest.mock('../models');
jest.mock('fs');

describe('createActivity controller', () => {

    jest.spyOn(console, "error").mockImplementation(() => {});

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

        jest.clearAllMocks();
    });

    it('should create a new activity successfully', async () => {
        const fakeUser = { id: 1, mosque_id: 10 };
        const fakeActivity = { id: 123, ...req.body };

        dbActivity.user.findByPk.mockResolvedValue(fakeUser);
        dbActivity.activity.create.mockResolvedValue(fakeActivity);

        await createActivity(req, res);

        expect(dbActivity.user.findByPk).toHaveBeenCalledWith(req.userId);
        expect(dbActivity.activity.create).toHaveBeenCalledWith(expect.objectContaining({
            mosque_id: fakeUser.mosque_id,
            user_id: req.userId,
            event_name: req.body.event_name,
            image: '/uploads/kajian.jpg',
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(fakeActivity);
    });

    it('should return 404 if user not found and delete uploaded file', async () => {
        dbActivity.user.findByPk.mockResolvedValue(null);

        await createActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });

        expect(fs.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/uploads[\\/]+kajian\.jpg/),
            expect.any(Function)
        );
    });

    it('should return 500 if Activity.create throws error', async () => {
        const fakeUser = { id: 1, mosque_id: 10 };
        dbActivity.user.findByPk.mockResolvedValue(fakeUser);
        dbActivity.activity.create.mockRejectedValue(new Error('DB error'));

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
        const multerError = new Error("Hanya file JPEG, JPG, PNG yang diizinkan!");

        dbActivity.user.findByPk.mockResolvedValue(fakeUser);
        dbActivity.activity.create.mockImplementation(() => { throw multerError });

        await createActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: multerError.message });

        expect(fs.unlink).toHaveBeenCalledWith(
            expect.stringMatching(/uploads[\\/]+kajian\.jpg/),
            expect.any(Function)
        );
    });
});

describe('getActivities controller', () => {
    let req, res;

    beforeEach(() => {
        req = { userId: 1 };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    it('should return 404 if user not found', async () => {
        dbActivity.user.findByPk.mockResolvedValue(null);

        await getActivities(req, res);

        expect(dbActivity.user.findByPk).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return activities if user exists', async () => {
        const mockUser = { id: 1, mosque_id: 123 };
        const mockActivities = [
            { id: 1, title: 'Kajian', start_date: '2025-01-01' },
            { id: 2, title: 'Sholat Jumat', start_date: '2024-12-31' }
        ];

        dbActivity.user.findByPk.mockResolvedValue(mockUser);
        dbActivity.activity.findAll.mockResolvedValue(mockActivities);

        await getActivities(req, res);

        expect(dbActivity.user.findByPk).toHaveBeenCalledWith(1);
        expect(dbActivity.activity.findAll).toHaveBeenCalledWith({
            where: { mosque_id: 123 },
            order: [['start_date', 'DESC']]
        });
        expect(res.json).toHaveBeenCalledWith(mockActivities);
    });

    it('should return 500 if error occurs', async () => {
        dbActivity.user.findByPk.mockRejectedValue(new Error('DB Error'));

        await getActivities(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to retrieve activities' });
    });
});

// get activity by id for admin
describe('getActivityById controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 1,
            params: { id: 101 }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    it('should return 404 if user not found', async () => {
        dbActivity.user.findByPk.mockResolvedValue(null);

        await getActivityById(req, res);

        expect(dbActivity.user.findByPk).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 404 if activity not found', async () => {
        const mockUser = { id: 1, mosque_id: 10 };
        dbActivity.user.findByPk.mockResolvedValue(mockUser);
        dbActivity.activity.findOne.mockResolvedValue(null);

        await getActivityById(req, res);

        expect(dbActivity.activity.findOne).toHaveBeenCalledWith({
            where: {
                activities_id: 101,
                mosque_id: mockUser.mosque_id
            }
        });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Activity not found' });
    });

    it('should return the activity if found', async () => {
        const mockUser = { id: 1, mosque_id: 10 };
        const mockActivity = {
            activities_id: 101,
            event_name: 'Kajian Subuh',
            mosque_id: 10
        };

        dbActivity.user.findByPk.mockResolvedValue(mockUser);
        dbActivity.activity.findOne.mockResolvedValue(mockActivity);

        await getActivityById(req, res);

        expect(dbActivity.activity.findOne).toHaveBeenCalledWith({
            where: {
                activities_id: 101,
                mosque_id: mockUser.mosque_id
            }
        });
        expect(res.json).toHaveBeenCalledWith(mockActivity);
    });

    it('should return 500 if error occurs', async () => {
        dbActivity.user.findByPk.mockRejectedValue(new Error('DB Error'));

        await getActivityById(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to retrieve activity' });
    });
});

// delete activity
describe('deleteActivity controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            userId: 1,
            params: { id: 101 }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    it('should return 404 if user not found', async () => {
        dbActivity.user.findByPk.mockResolvedValue(null);

        await deleteActivity(req, res);

        expect(dbActivity.user.findByPk).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 404 if activity not found', async () => {
        const mockUser = { id: 1, mosque_id: 10 };
        dbActivity.user.findByPk.mockResolvedValue(mockUser);
        dbActivity.activity.findOne.mockResolvedValue(null);

        await deleteActivity(req, res);

        expect(dbActivity.activity.findOne).toHaveBeenCalledWith({
            where: {
                activities_id: 101,
                mosque_id: 10
            }
        });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Activity not found' });
    });

    it('should delete activity and related image', async () => {
        const mockUser = { id: 1, mosque_id: 10 };
        const mockActivity = {
            activities_id: 101,
            image: '/uploads/kajian.jpg',
            destroy: jest.fn().mockResolvedValue(true)
        };

        dbActivity.user.findByPk.mockResolvedValue(mockUser);
        dbActivity.activity.findOne.mockResolvedValue(mockActivity);

        // ✅ Gunakan spyOn untuk mock fs.unlink
        const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation((path, callback) => {
            callback(null); // Simulasi penghapusan berhasil
        });

        await deleteActivity(req, res);

        expect(mockActivity.destroy).toHaveBeenCalled();
        expect(unlinkSpy).toHaveBeenCalledWith(
            expect.stringMatching(/uploads[\\/]+kajian\.jpg/),
            expect.any(Function)
        );
        expect(res.json).toHaveBeenCalledWith({ message: 'Activity deleted successfully' });

        unlinkSpy.mockRestore(); // opsional: bersihkan spy setelah test
    });

    it('should return 500 if error occurs', async () => {
        dbActivity.user.findByPk.mockRejectedValue(new Error('DB Error'));

        await deleteActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to delete activity' });
    });
});