// tests/activity.controller.test.ts
import { Request, Response } from "express";
import * as activityController from "../controllers/activity.controller";
import { createActivity, deleteActivity, getActivities, getActivityById, getAllUpcomingActivities, getPastActivities, getUpcomingActivities, updateActivity } from "../controllers/activity.controller";
import { activity, user, mosques } from "../models"; // langsung ambil dari models
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";

jest.mock("../models", () => ({
    activity: {
        findOne: jest.fn(),
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        deleteImageFile: jest.fn(),
        findAndCountAll: jest.fn(),
    },
    user: {
        findByPk: jest.fn(),
    },
    mosques: {
        findOne: jest.fn(),
    },
}));

jest.mock("date-fns", () => ({
    ...jest.requireActual("date-fns"),
    format: jest.fn(),
}));

const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.get = jest.fn().mockReturnValue("localhost:8080");
    return res;
};

describe("Activity Controller - createActivity", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        req = {
            userId: 1,
            body: {
                event_name: "Pengajian Subuh",
                event_description: "Kegiatan rutin setiap minggu",
                start_date: "2025-06-15",
                start_time: "05:00",
            },
            file: undefined,
        } as unknown as Request;

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        res = {
            status: statusMock,
        } as unknown as Response;

        jest.clearAllMocks();
    });

    it("should create a new activity", async () => {
        const mockUser = { id: 1, mosque_id: 2 };
        const mockCreatedActivity = {
            id: 123,
            ...req.body,
            mosque_id: mockUser.mosque_id,
            user_id: mockUser.id,
            end_date: "2025-06-15",
            end_time: null,
            image: null,
        };

        (user.findByPk as jest.Mock).mockResolvedValue(mockUser);
        (activity.create as jest.Mock).mockResolvedValue(mockCreatedActivity);

        await createActivity(req as Request, res as Response);

        expect(user.findByPk).toHaveBeenCalledWith(1);
        expect(activity.create).toHaveBeenCalledWith(expect.objectContaining({
            mosque_id: 2,
            user_id: 1,
            event_name: "Pengajian Subuh",
            event_description: "Kegiatan rutin setiap minggu",
            start_date: "2025-06-15",
            end_date: "2025-06-15", // Default dari start_date
            start_time: "05:00",
            end_time: null,
            image: null,
        }));
        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith(mockCreatedActivity);
    });
});

describe("Activity Controller - getActivities", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        req = {
            userId: 1,
        } as unknown as Request;

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        res = {
            status: statusMock,
            json: jsonMock,
        } as unknown as Response;

        jest.clearAllMocks();
    });

    it("should return list of activities for user's mosque", async () => {
        const mockUser = { id: 1, mosque_id: 10 };
        const mockActivities = [
            { id: 1, event_name: "A", start_date: "2025-06-20" },
            { id: 2, event_name: "B", start_date: "2025-06-18" },
        ];

        (user.findByPk as jest.Mock).mockResolvedValue(mockUser);
        (activity.findAll as jest.Mock).mockResolvedValue(mockActivities);

        await getActivities(req as Request, res as Response);

        expect(user.findByPk).toHaveBeenCalledWith(1);
        expect(activity.findAll).toHaveBeenCalledWith({
            where: { mosque_id: mockUser.mosque_id },
            order: [["start_date", "DESC"]],
        });
        expect(jsonMock).toHaveBeenCalledWith(mockActivities);
    });

    it("should return 404 if user not found", async () => {
        (user.findByPk as jest.Mock).mockResolvedValue(null);

        await getActivities(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should handle server error", async () => {
        (user.findByPk as jest.Mock).mockRejectedValue(new Error("DB Error"));

        await getActivities(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ message: "Failed to retrieve activities" });
    });
});

describe("Activity Controller - getActivityById", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        req = {
            userId: 1,
            params: {
                id: "123",
            },
        } as unknown as Request;

        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        res = {
            status: statusMock,
            json: jsonMock,
        } as unknown as Response;

        jest.clearAllMocks();
    });

    it("should return the activity if found", async () => {
        const mockUser = { id: 1, mosque_id: 5 };
        const mockActivity = { activities_id: 123, event_name: "Kegiatan A" };

        (user.findByPk as jest.Mock).mockResolvedValue(mockUser);
        (activity.findOne as jest.Mock).mockResolvedValue(mockActivity);

        await getActivityById(req as Request, res as Response);

        expect(user.findByPk).toHaveBeenCalledWith(1);
        expect(activity.findOne).toHaveBeenCalledWith({
            where: {
                activities_id: "123",
                mosque_id: 5,
            },
        });
        expect(jsonMock).toHaveBeenCalledWith(mockActivity);
    });

    it("should return 404 if user not found", async () => {
        (user.findByPk as jest.Mock).mockResolvedValue(null);

        await getActivityById(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return 404 if activity not found", async () => {
        const mockUser = { id: 1, mosque_id: 5 };
        (user.findByPk as jest.Mock).mockResolvedValue(mockUser);
        (activity.findOne as jest.Mock).mockResolvedValue(null);

        await getActivityById(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith({ message: "Activity not found" });
    });

    it("should handle server error", async () => {
        (user.findByPk as jest.Mock).mockRejectedValue(new Error("DB Error"));

        await getActivityById(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ message: "Failed to retrieve activity" });
    });
});

describe("Activity Controller - updateActivity", () => {
    let mockUser: any;
    let mockActivity: any;

    beforeEach(() => {
        // Reset semua mocks
        jest.clearAllMocks();

        // Buat dummy user
        mockUser = {
            id: 1,
            mosque_id: 10,
        };

        // Buat dummy activity
        mockActivity = {
            activities_id: 123,
            start_date: new Date("2024-06-01"),
            end_date: new Date("2024-06-02"),
            start_time: "10:00",
            end_time: "12:00",
            image: "/uploads/old-image.jpg",
            update: jest.fn(),
            reload: jest.fn().mockResolvedValue({ updated: true }),
        };
    });

    it("should update activity successfully", async () => {
        const req = {
            params: { id: "123" },
            userId: 1,
            body: {
                event_name: "Updated Name",
                start_date: "2024-06-03",
                end_date: "2024-06-04",
                start_time: "09:00",
                end_time: "11:00",
                deleteImage: "false",
            },
            file: null,
        } as unknown as Request;

        const res = mockResponse();

        // 🔧 Mock DB methods
        jest.spyOn(user, "findByPk").mockResolvedValue(mockUser);
        jest.spyOn(activity, "findOne").mockResolvedValue(mockActivity);

        // 🔧 Mock deleteImageFile agar tidak menghapus file sungguhan
        jest.spyOn(activityController, "deleteImageFile").mockImplementation(() => { });

        // 🚀 Eksekusi fungsi yang dites
        await activityController.updateActivity(req, res);

        // ✅ Verifikasi update terpanggil
        expect(mockActivity.update).toHaveBeenCalledWith(expect.objectContaining({
            event_name: "Updated Name",
            start_date: new Date("2024-06-03T12:00:00"),
            end_date: new Date("2024-06-04T12:00:00"),
            start_time: "09:00",
            end_time: "11:00",
        }));

        // ✅ Verifikasi response
        expect(res.json).toHaveBeenCalledWith({
            message: "Kegiatan berhasil diperbarui",
            activity: { updated: true },
        });
    });

    it("should return 404 if user not found", async () => {
        const req = {
            params: { id: "123" },
            userId: 999,
            body: {},
            file: null,
        } as unknown as Request;

        const res = mockResponse();

        jest.spyOn(user, "findByPk").mockResolvedValue(null); // simulate user not found

        await activityController.updateActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "User tidak ditemukan" });
    });

    it("should return 404 if activity not found", async () => {
        const req = {
            params: { id: "123" },
            userId: 1,
            body: {},
            file: null,
        } as unknown as Request;

        const res = mockResponse();

        jest.spyOn(user, "findByPk").mockResolvedValue(mockUser);
        jest.spyOn(activity, "findOne").mockResolvedValue(null); // simulate activity not found

        await activityController.updateActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Kegiatan tidak ditemukan" });
    });

    it("should return 400 if end time before start time on same day", async () => {
        const req = {
            params: { id: "123" },
            userId: 1,
            body: {
                start_date: "2024-06-05",
                end_date: "2024-06-05", // Sama dengan start_date
                start_time: "15:00",
                end_time: "13:00",     // Invalid: lebih awal
            },
            file: null,
        } as unknown as Request;

        const res = mockResponse();

        jest.spyOn(user, "findByPk").mockResolvedValue(mockUser);
        jest.spyOn(activity, "findOne").mockResolvedValue(mockActivity);

        await activityController.updateActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Jam selesai harus setelah jam mulai pada hari yang sama.",
        });
    });


    it("should return 500 if unexpected error occurs", async () => {
        const req = {
            params: { id: "123" },
            userId: 1,
            body: {},
            file: null,
        } as unknown as Request;

        const res = mockResponse();

        jest.spyOn(user, "findByPk").mockRejectedValue(new Error("DB ERROR")); // Simulasi error database
        jest.spyOn(activityController, "deleteImageFile").mockImplementation(() => { });

        await activityController.updateActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Gagal memperbarui kegiatan" });
    });
});

describe("Activity Controller - deleteActivity", () => {
    let mockUser: any;
    let mockActivity: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUser = {
            id: 1,
            mosque_id: 101,
        };

        mockActivity = {
            activities_id: 123,
            image: "/uploads/sample.jpg",
            destroy: jest.fn().mockResolvedValue(undefined),
        };
    });

    it("should delete activity successfully", async () => {
        const req = {
            params: { id: "123" },
            userId: 1,
        } as unknown as Request;

        const res = mockResponse();

        // Mock database call
        jest.spyOn(user, "findByPk").mockResolvedValue(mockUser);
        jest.spyOn(activity, "findOne").mockResolvedValue(mockActivity);

        await deleteActivity(req, res);

        expect(mockActivity.destroy).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            message: "Activity deleted successfully",
        });
    });

    it("should return 404 if user not found", async () => {
        const req = {
            params: { id: "123" },
            userId: 999,
        } as unknown as Request;

        const res = mockResponse();

        jest.spyOn(user, "findByPk").mockResolvedValue(null);

        await deleteActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return 404 if activity not found", async () => {
        const req = {
            params: { id: "123" },
            userId: 1,
        } as unknown as Request;

        const res = mockResponse();

        jest.spyOn(user, "findByPk").mockResolvedValue(mockUser);
        jest.spyOn(activity, "findOne").mockResolvedValue(null);

        await deleteActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Activity not found" });
    });

    it("should return 500 if error thrown", async () => {
        const req = {
            params: { id: "123" },
            userId: 1,
        } as unknown as Request;

        const res = mockResponse();

        jest.spyOn(user, "findByPk").mockRejectedValue(new Error("DB error"));

        await deleteActivity(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Failed to delete activity",
        });
    });
});

describe("Activity Controller - getUpcomingActivities", () => {
    const mockMosque = {
        mosque_id: 101,
        name: "Masjid Raya",
    };

    const mockActivities = [
        {
            activities_id: 1,
            start_date: new Date("2025-06-20"),
            end_date: new Date("2025-06-20"),
            event_name: "Kajian Subuh",
            event_description: "Pembahasan fiqih",
            image: "/uploads/kajian.jpg",
            start_time: "05:00:00",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return list of upcoming activities formatted correctly", async () => {
        const req = {
            params: { slug: "masjid-raya" },
            protocol: "http",
            get: () => "localhost:8080",
        } as unknown as Request;

        const res = mockResponse();

        // Mock DB
        (mosques.findOne as jest.Mock).mockResolvedValue(mockMosque);
        (activity.findAll as jest.Mock).mockResolvedValue(mockActivities);

        // Mock date formatting
        (format as jest.Mock).mockImplementation((date: Date, fmt: string) => {
            if (fmt === "dd") return "20";
            if (fmt === "MMM") return "Jun";
            if (fmt === "eeee, d MMMM yyyy") return "Jumat, 20 Juni 2025";
            return "formatted";
        });

        await getUpcomingActivities(req, res);

        expect(mosques.findOne).toHaveBeenCalledWith({ where: { slug: "masjid-raya" } });
        expect(activity.findAll).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith([
            {
                id: 1,
                day: "20",
                month: "Jun",
                full_date: "Jumat, 20 Juni 2025",
                title: "Kajian Subuh",
                location: "Masjid Raya",
                image: "http://localhost:8080/uploads/kajian.jpg",
                description: "Pembahasan fiqih",
                time: "05:00",
            },
        ]);
    });

    it("should return 404 if mosque not found", async () => {
        const req = {
            params: { slug: "tidak-ada" },
        } as unknown as Request;

        const res = mockResponse();
        (mosques.findOne as jest.Mock).mockResolvedValue(null);

        await getUpcomingActivities(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Masjid tidak ditemukan." });
    });

    it("should handle server error", async () => {
        const req = {
            params: { slug: "masjid-error" },
        } as unknown as Request;

        const res = mockResponse();
        (mosques.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

        await getUpcomingActivities(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Gagal mengambil kegiatan mendatang",
        });
    });
});

describe("Activity Controller - getAllUpcomingActivities", () => {
    const mockMosque = {
        mosque_id: 1,
        name: "Masjid Al Hidayah",
    };

    const mockActivities = [
        {
            activities_id: 10,
            start_date: new Date("2025-06-20"),
            end_date: new Date("2025-06-21"),
            event_name: "Tabligh Akbar",
            event_description: "Ustadz Hanan Attaki",
            image: "/uploads/tablig.jpg",
            start_time: "19:00:00",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return paginated upcoming activities", async () => {
        const req = {
            params: { slug: "masjid-hidayah" },
            query: { page: "2", limit: "1" },
            protocol: "http",
            get: () => "localhost:8080",
        } as unknown as Request;

        const res = mockResponse();

        // Mock DB
        (mosques.findOne as jest.Mock).mockResolvedValue(mockMosque);
        (activity.findAndCountAll as jest.Mock).mockResolvedValue({
            count: 5,
            rows: mockActivities,
        });

        (format as jest.Mock).mockImplementation((date: Date, fmt: string) => {
            if (fmt === "dd") return "20";
            if (fmt === "MMM") return "Jun";
            if (fmt === "eeee, d MMMM yyyy") return "Jumat, 20 Juni 2025";
            return "formatted";
        });

        await getAllUpcomingActivities(req, res);

        expect(mosques.findOne).toHaveBeenCalledWith({ where: { slug: "masjid-hidayah" } });
        expect(activity.findAndCountAll).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            data: [
                {
                    id: 10,
                    day: "20",
                    month: "Jun",
                    full_date: "Jumat, 20 Juni 2025",
                    title: "Tabligh Akbar",
                    location: "Masjid Al Hidayah",
                    image: "http://localhost:8080/uploads/tablig.jpg",
                    description: "Ustadz Hanan Attaki",
                    time: "19:00",
                },
            ],
            totalItems: 5,
            totalPages: 5,
            currentPage: 2,
        });
    });

    it("should return 404 if mosque not found", async () => {
        const req = {
            params: { slug: "tidak-ada" },
            query: {},
        } as unknown as Request;

        const res = mockResponse();

        (mosques.findOne as jest.Mock).mockResolvedValue(null);

        await getAllUpcomingActivities(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Masjid tidak ditemukan." });
    });

    it("should handle server error gracefully", async () => {
        const req = {
            params: { slug: "masjid-error" },
            query: {},
        } as unknown as Request;

        const res = mockResponse();

        (mosques.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

        await getAllUpcomingActivities(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Gagal mengambil data kegiatan" });
    });
});

describe("Activity Controller - getPastActivities", () => {
    const mockMosque = {
        mosque_id: 1,
        name: "Masjid Al Hidayah",
    };

    const mockActivities = [
        {
            activities_id: 101,
            start_date: new Date("2024-05-01"),
            end_date: new Date("2024-05-02"),
            event_name: "Kajian Subuh",
            event_description: "Kajian bersama ustadz Abdul Somad",
            image: "/uploads/kajian.jpg",
            start_time: "05:30:00",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return paginated past activities", async () => {
        const req = {
            params: { slug: "masjid-hidayah" },
            query: { page: "1", limit: "1" },
            protocol: "http",
            get: () => "localhost:8080",
        } as unknown as Request;

        const res = mockResponse();

        (mosques.findOne as jest.Mock).mockResolvedValue(mockMosque);
        (activity.findAndCountAll as jest.Mock).mockResolvedValue({
            count: 1,
            rows: mockActivities,
        });

        (format as jest.Mock).mockImplementation((date: Date, fmt: string) => {
            if (fmt === "dd") return "01";
            if (fmt === "MMM") return "Mei";
            if (fmt === "eeee, d MMMM yyyy") return "Rabu, 1 Mei 2024";
            return "formatted";
        });

        await getPastActivities(req, res);

        expect(mosques.findOne).toHaveBeenCalledWith({ where: { slug: "masjid-hidayah" } });
        expect(activity.findAndCountAll).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            data: [
                {
                    id: 101,
                    day: "01",
                    month: "Mei",
                    full_date: "Rabu, 1 Mei 2024",
                    title: "Kajian Subuh",
                    location: "Masjid Al Hidayah",
                    image: "http://localhost:8080/uploads/kajian.jpg",
                    description: "Kajian bersama ustadz Abdul Somad",
                    time: "05:30",
                },
            ],
            totalItems: 1,
            totalPages: 1,
            currentPage: 1,
        });
    });

    it("should return 404 if mosque not found", async () => {
        const req = {
            params: { slug: "tidak-ada" },
            query: {},
        } as unknown as Request;

        const res = mockResponse();

        (mosques.findOne as jest.Mock).mockResolvedValue(null);

        await getPastActivities(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Masjid tidak ditemukan." });
    });

    it("should handle server error", async () => {
        const req = {
            params: { slug: "masjid-error" },
            query: {},
        } as unknown as Request;

        const res = mockResponse();

        (mosques.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

        await getPastActivities(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Gagal mengambil data kegiatan lampau",
        });
    });
});