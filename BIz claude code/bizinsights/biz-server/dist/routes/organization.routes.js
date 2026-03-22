"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const createOrgSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1)
});
// Get all organizations for user
router.get('/', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const organizations = await prisma_1.prisma.organization.findMany({
            where: {
                members: {
                    some: {
                        userId: req.user.id
                    }
                },
                isDeleted: false
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        integrations: true,
                        insights: true
                    }
                }
            }
        });
        res.json({ success: true, data: organizations });
    }
    catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});
// Create organization
router.post('/', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { name, slug } = createOrgSchema.parse(req.body);
        const existingOrg = await prisma_1.prisma.organization.findUnique({
            where: { slug }
        });
        if (existingOrg) {
            return res.status(400).json({ error: 'Organization slug already exists' });
        }
        const organization = await prisma_1.prisma.organization.create({
            data: {
                name,
                slug,
                members: {
                    create: {
                        userId: req.user.id,
                        role: 'OWNER'
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        }
                    }
                }
            }
        });
        res.json({ success: true, data: organization });
    }
    catch (error) {
        console.error('Error creating organization:', error);
        res.status(500).json({ error: 'Failed to create organization' });
    }
});
// Get organization by ID
router.get('/:id', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const organization = await prisma_1.prisma.organization.findFirst({
            where: {
                id: req.params.id,
                members: {
                    some: {
                        userId: req.user.id
                    }
                },
                isDeleted: false
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        }
                    }
                },
                integrations: {
                    select: {
                        id: true,
                        platform: true,
                        status: true,
                        lastSyncAt: true
                    }
                },
                _count: {
                    select: {
                        insights: true,
                        reports: true,
                        dataPoints: true
                    }
                }
            }
        });
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.json({ success: true, data: organization });
    }
    catch (error) {
        console.error('Error fetching organization:', error);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});
exports.default = router;
//# sourceMappingURL=organization.routes.js.map