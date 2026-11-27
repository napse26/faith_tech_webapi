"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const request_id_1 = require("./common/middleware/request-id");
const error_handler_1 = require("./common/middleware/error-handler");
const rate_limiter_1 = require("./common/middleware/rate-limiter");
const database_1 = require("./config/database");
const api_response_1 = require("./common/types/api-response");
const openapi_json_1 = __importDefault(require("./docs/openapi.json"));
// Route imports
const auth_routes_1 = require("./modules/auth/auth.routes");
const profile_routes_1 = require("./modules/profiles/profile.routes");
const birth_details_routes_1 = require("./modules/birth-details/birth-details.routes");
const user_routes_1 = require("./modules/users/user.routes");
const customer_routes_1 = require("./modules/customer/customer.routes");
const customer_feature_routes_1 = require("./modules/customer/customer-feature.routes");
const astrologer_routes_1 = require("./modules/astrologers/astrologer.routes");
const admin_astrologer_routes_1 = require("./modules/astrologers/admin-astrologer.routes");
const pooja_routes_1 = require("./modules/poojas/pooja.routes");
const pooja_booking_routes_1 = require("./modules/poojas/pooja-booking.routes");
const admin_pooja_routes_1 = require("./modules/poojas/admin-pooja.routes");
const admin_pooja_booking_routes_1 = require("./modules/poojas/admin-pooja-booking.routes");
// Ensure BigInt values serialize cleanly to JSON
BigInt.prototype.toJSON = function () {
    return Number(this);
};
function createApp() {
    const app = (0, express_1.default)();
    // Trust reverse proxies (Nginx, AWS ALB, Cloudflare) on deployed servers
    app.set('trust proxy', 1);
    // Basic security and request parsing
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false, // Disables Helmet CSP so Swagger UI and HTTP IP deployments load reliably
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    }));
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
    // Request correlation / trace ID
    app.use(request_id_1.requestIdMiddleware);
    // Root route: Redirect browsers to Swagger UI documentation, return API info for JSON clients
    app.get('/', (req, res) => {
        if (req.accepts('html')) {
            return res.redirect('/api/docs/');
        }
        return res.status(200).json((0, api_response_1.createSuccessResponse)({
            name: 'DharmaDarshan Astrology & Customer Management API',
            version: '1.0.0',
            docs: '/api/docs/',
            health: '/health',
            ready: '/ready',
            status: 'DEPLOYED_LATEST'
        }, 'Welcome to FaithTech DharmaDarshan API', req.traceId));
    });
    // Health check & readiness probes (unthrottled)
    app.get('/health', (req, res) => {
        res.status(200).json((0, api_response_1.createSuccessResponse)({
            status: 'UP',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            deployment: 'LATEST'
        }, 'Service is healthy', req.traceId));
    });
    app.get('/ready', async (req, res) => {
        try {
            await database_1.prisma.$queryRaw `SELECT 1`;
            res.status(200).json((0, api_response_1.createSuccessResponse)({
                database: 'CONNECTED',
                status: 'READY'
            }, 'Service and database are ready', req.traceId));
        }
        catch (error) {
            res.status(503).json((0, api_response_1.createErrorResponse)('Service not ready: Database connection failed', [{ code: 'DATABASE_UNAVAILABLE', message: 'Unable to reach PostgreSQL database' }], req.traceId));
        }
    });
    // Swagger Documentation Options
    const swaggerUiOptions = {
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            tryItOutEnabled: true, // Enables Try It Out by default so parameters and body inputs are editable immediately
            filter: true
        },
        customSiteTitle: 'DharmaDarshan API Documentation'
    };
    // Swagger Documentation aliases & trailing slash handlers
    app.get(['/docs', '/swagger'], (req, res) => {
        res.redirect('/api/docs/');
    });
    // Swagger Documentation
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi_json_1.default, swaggerUiOptions));
    app.get('/api/docs.json', (req, res) => {
        res.json(openapi_json_1.default);
    });
    // Global rate limiter applied to API endpoints
    app.use('/api', rate_limiter_1.globalLimiter);
    // Mount versioned module routes
    app.use('/api/v1/auth', auth_routes_1.authRoutes);
    app.use('/api/v1/customer', customer_feature_routes_1.customerV1Router);
    app.use('/api/v1/customers', customer_feature_routes_1.customerV1Router);
    app.use('/api/v1/customers/me', customer_routes_1.customerRoutes);
    app.use('/api/v1/users', profile_routes_1.profileRoutes);
    app.use('/api/v1/users', birth_details_routes_1.birthDetailsRoutes);
    app.use('/api/v1/users', user_routes_1.userRoutes);
    app.use('/api/v1/astrologers', astrologer_routes_1.astrologerRoutes);
    app.use('/api/v1/admin/astrologers', admin_astrologer_routes_1.adminAstrologerRoutes);
    app.use('/api/v1/poojas', pooja_routes_1.poojaRoutes);
    app.use('/api/v1/pooja-bookings', pooja_booking_routes_1.poojaBookingRoutes);
    app.use('/api/v1/admin/poojas', admin_pooja_routes_1.adminPoojaRoutes);
    app.use('/api/v1/admin/pooja-bookings', admin_pooja_booking_routes_1.adminPoojaBookingRoutes);
    // Catch-all 404 handler
    app.use((req, res) => {
        res.status(404).json((0, api_response_1.createErrorResponse)(`Endpoint ${req.method} ${req.originalUrl} not found`, [{ code: 'ROUTE_NOT_FOUND', message: 'The requested route does not exist' }], req.traceId));
    });
    // Centralized Error Handler
    app.use(error_handler_1.errorHandler);
    return app;
}
exports.app = createApp();
