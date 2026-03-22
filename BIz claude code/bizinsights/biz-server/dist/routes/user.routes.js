"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Get user settings
router.get('/settings', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                settings: true,
            },
        });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: user.settings || {} });
    }
    catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
});
// Update user settings
router.put('/settings', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const settings = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { settings },
            select: {
                id: true,
                name: true,
                email: true,
                settings: true,
            },
        });
        res.json({ success: true, data: user.settings });
    }
    catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
});
// Update user profile
router.put('/profile', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, email } = req.body;
        // Check if email is already taken
        if (email) {
            const existingUser = await prisma_1.prisma.user.findFirst({
                where: {
                    email,
                    NOT: { id: userId },
                },
            });
            if (existingUser) {
                return res.status(400).json({ success: false, error: 'Email already in use' });
            }
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(email && { email }),
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});
// Change password
router.post('/change-password', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Both passwords required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !user.password) {
            return res.status(400).json({ success: false, error: 'User not found' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        res.json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
});
// Get user notifications
router.get('/notifications', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { limit, unreadOnly } = req.query;
        const where = { userId };
        if (unreadOnly === 'true') {
            where.read = false;
        }
        const notifications = await prisma_1.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit ? parseInt(limit) : 50,
        });
        res.json({ success: true, data: notifications });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
});
// Mark notification as read
router.post('/notifications/:id/read', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma_1.prisma.notification.update({
            where: { id },
            data: { read: true },
        });
        res.json({ success: true, data: notification });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
    }
});
// Mark all notifications as read
router.post('/notifications/read-all', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        await prisma_1.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
        res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map