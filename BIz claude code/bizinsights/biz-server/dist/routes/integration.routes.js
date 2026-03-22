"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Placeholder routes for integrations
router.get('/available', auth_middleware_1.authenticate, async (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'shopify', name: 'Shopify', icon: 'shopify' },
            { id: 'stripe', name: 'Stripe', icon: 'stripe' },
            { id: 'google-analytics', name: 'Google Analytics', icon: 'google' },
            { id: 'facebook-ads', name: 'Facebook Ads', icon: 'facebook' }
        ]
    });
});
exports.default = router;
//# sourceMappingURL=integration.routes.js.map