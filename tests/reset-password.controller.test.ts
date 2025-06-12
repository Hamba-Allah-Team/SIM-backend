// Mock dependencies
const db_mock_reset = {
    user: {
        findOne: jest.fn(),
    },
};

const bcrypt_mock_reset = {
    hashSync: jest.fn(),
};

const sendMail_mock_reset = jest.fn();

jest.mock('../models', () => db_mock_reset);
jest.mock('bcryptjs', () => bcrypt_mock_reset);
jest.mock('../utils/sendMail', () => ({ sendMail: sendMail_mock_reset }));

const resetPasswordController = require('../controllers/reset-password.controller');

describe('Reset Password Controller', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('sendResetPassword', () => {
        it(' should send a reset code successfully if the user exists', async () => {
            const mockUser = {
                email: 'user@example.com',
                save: jest.fn().mockResolvedValue(true),
            };
            db_mock_reset.user.findOne.mockResolvedValue(mockUser);
            req.body.email = 'user@example.com';

            await resetPasswordController.sendResetPassword(req, res);

            expect(db_mock_reset.user.findOne).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
            expect(mockUser.save).toHaveBeenCalled();
            expect(sendMail_mock_reset).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({ message: "Kode reset password berhasil dikirim" });
        });

        it(' should return 404 if the user is not found', async () => {
            db_mock_reset.user.findOne.mockResolvedValue(null);
            req.body.email = 'nonexistent@example.com';

            await resetPasswordController.sendResetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({ message: "Pengguna tidak ditemukan" });
        });

        it(' should handle server errors during the process', async () => {
            const error = new Error('Database connection failed');
            db_mock_reset.user.findOne.mockRejectedValue(error);
            req.body.email = 'user@example.com';

            await resetPasswordController.sendResetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({ message: error.message });
        });
    });

    describe('verifyResetPassword', () => {
        const futureDate = new Date(Date.now() + 10 * 60 * 1000); 
        const pastDate = new Date(Date.now() - 10 * 60 * 1000); 

        it(' should verify the reset code successfully', async () => {
            const mockUser = {
                email: 'user@example.com',
                password_reset_code: '123456',
                password_reset_expires_at: futureDate,
            };
            db_mock_reset.user.findOne.mockResolvedValue(mockUser);
            req.body = { email: 'user@example.com', resetCode: '123456' };

            await resetPasswordController.verifyResetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({ message: "Kode reset berhasil diverifikasi" });
        });

        it(' should return 404 if the user is not found', async () => {
            db_mock_reset.user.findOne.mockResolvedValue(null);
            req.body = { email: 'nonexistent@example.com', resetCode: '123456' };

            await resetPasswordController.verifyResetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({ message: "Pengguna tidak ditemukan" });
        });

        it(' should return 400 for an invalid reset code', async () => {
            const mockUser = {
                email: 'user@example.com',
                password_reset_code: '123456',
                password_reset_expires_at: futureDate,
            };
            db_mock_reset.user.findOne.mockResolvedValue(mockUser);
            req.body = { email: 'user@example.com', resetCode: '999999' }; 

            await resetPasswordController.verifyResetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Kode reset tidak valid" });
        });

        it(' should return 400 for an expired reset code', async () => {
            const mockUser = {
                email: 'user@example.com',
                password_reset_code: '123456',
                password_reset_expires_at: pastDate, 
            };
            db_mock_reset.user.findOne.mockResolvedValue(mockUser);
            req.body = { email: 'user@example.com', resetCode: '123456' };

            await resetPasswordController.verifyResetPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Kode reset telah kedaluwarsa" });
        });
    });

    describe('changePassword', () => {
        const validBody = {
            email: 'user@example.com',
            resetCode: '123456',
            newPassword: 'newPassword123',
            confirmNewPassword: 'newPassword123'
        };

        it(' should change the password successfully with a valid code and matching passwords', async () => {
            const mockUser = {
                password: 'oldHashedPassword',
                password_reset_code: '123456',
                password_reset_expires_at: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };
            db_mock_reset.user.findOne.mockResolvedValue(mockUser);
            bcrypt_mock_reset.hashSync.mockReturnValue('hashedNewPassword');
            req.body = validBody;

            await resetPasswordController.changePassword(req, res);

            expect(db_mock_reset.user.findOne).toHaveBeenCalledWith({ where: { email: validBody.email } });
            expect(bcrypt_mock_reset.hashSync).toHaveBeenCalledWith(validBody.newPassword, 8);
            expect(mockUser.password).toBe('hashedNewPassword');
            expect(mockUser.password_reset_code).toBeNull();
            expect(mockUser.password_reset_expires_at).toBeNull();
            expect(mockUser.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({ message: "Kata sandi berhasil direset melalui kode reset." });
        });

        it(' should return 400 if any field is missing', async () => {
            req.body = { email: 'user@example.com', resetCode: '123' }; 

            await resetPasswordController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Semua kolom wajib diisi." });
        });

        it(' should return 400 if the new password is less than 8 characters', async () => {
            req.body = { ...validBody, newPassword: 'short', confirmNewPassword: 'short' };

            await resetPasswordController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Kata sandi baru harus minimal 8 karakter." });
        });

        it(' should return 400 if the new passwords do not match', async () => {
            req.body = { ...validBody, confirmNewPassword: 'doesNotMatch' };

            await resetPasswordController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Konfirmasi kata sandi tidak cocok." });
        });

        it(' should return 404 if user is not found', async () => {
            db_mock_reset.user.findOne.mockResolvedValue(null);
            req.body = validBody;

            await resetPasswordController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({ message: "Pengguna tidak ditemukan." });
        });

        it(' should return 400 if the reset code is invalid', async () => {
            const mockUser = { password_reset_code: 'correct_code' };
            db_mock_reset.user.findOne.mockResolvedValue(mockUser);
            req.body = { ...validBody, resetCode: 'wrong_code' };

            await resetPasswordController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ message: "Kode reset tidak valid." });
        });
    });
});